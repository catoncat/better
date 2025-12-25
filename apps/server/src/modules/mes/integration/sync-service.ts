import { createHash } from "node:crypto";
import type { PrismaClient } from "@better-app/db";
import { StationType } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import type { ErpRoute, IntegrationEnvelope } from "./erp-service";
import { pullErpRoutes } from "./erp-service";

type SyncOptions = {
	since?: string;
	startRow?: number;
	limit?: number;
};

type SyncResult<T> = {
	payload: IntegrationEnvelope<T>;
	messageId: string;
	businessKey: string;
	dedupeKey?: string | null;
};

type CursorMeta = {
	nextStartRow?: number;
	since?: string;
};

const isEnvelope = (value: unknown): value is IntegrationEnvelope<ErpRoute> => {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.sourceSystem === "string" &&
		typeof record.entityType === "string" &&
		typeof record.cursor === "object" &&
		Array.isArray(record.items)
	);
};

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const hashPayload = (value: unknown) =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

const parseCursorMeta = (meta: unknown): CursorMeta | null => {
	if (!meta || typeof meta !== "object") return null;
	const raw = meta as Record<string, unknown>;
	const nextStartRow = typeof raw.nextStartRow === "number" ? raw.nextStartRow : undefined;
	const since = typeof raw.since === "string" ? raw.since : undefined;
	return nextStartRow || since ? { nextStartRow, since } : null;
};

const resolveSyncTimestamp = (value?: string) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const buildBusinessKey = (
	sourceSystem: string,
	entityType: string,
	since: string | null,
	startRow: number,
	limit: number,
) => `${sourceSystem}:${entityType}:since:${since ?? "NONE"}:start:${startRow}:limit:${limit}`;

const buildSourceStepKey = (routeNo: string, stepNo: number, processCode: string) =>
	`ERP:${routeNo}:${stepNo}:${processCode}`;

const toDateOrNull = (value?: string) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const normalizeErpRoutes = async (tx: PrismaClient, routes: ErpRoute[], dedupeKey: string) => {
	for (const route of routes) {
		if (!route.header.routeNo) continue;
		const routing = await tx.routing.upsert({
			where: { code: route.header.routeNo },
			update: {
				name: route.header.routeName || route.header.routeNo,
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				productCode: route.header.productCode || null,
				effectiveFrom: toDateOrNull(route.header.effectiveFrom),
				effectiveTo: toDateOrNull(route.header.effectiveTo),
				meta: {
					erp: {
						useOrgCode: route.header.useOrgCode,
						createOrgCode: route.header.createOrgCode,
						routeSource: route.header.routeSource,
						bomCode: route.header.bomCode,
						modifiedAt: route.header.modifiedAt,
					},
				},
			},
			create: {
				code: route.header.routeNo,
				name: route.header.routeName || route.header.routeNo,
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				productCode: route.header.productCode || null,
				effectiveFrom: toDateOrNull(route.header.effectiveFrom),
				effectiveTo: toDateOrNull(route.header.effectiveTo),
				meta: {
					erp: {
						useOrgCode: route.header.useOrgCode,
						createOrgCode: route.header.createOrgCode,
						routeSource: route.header.routeSource,
						bomCode: route.header.bomCode,
						modifiedAt: route.header.modifiedAt,
					},
				},
			},
		});

		await tx.erpRouteHeaderRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				headId: route.header.headId || null,
				payload: route.header,
				dedupeKey,
			},
		});

		const stepNos: number[] = [];

		for (const step of route.steps) {
			if (!Number.isFinite(step.stepNo)) continue;
			stepNos.push(step.stepNo);
			const processCode = step.processCode || `ERP_${route.header.routeNo}_${step.stepNo}`;
			const processName = step.processName || processCode;

			let operation = await tx.operationMapping.findUnique({
				where: {
					sourceSystem_sourceProcessKey: {
						sourceSystem: "ERP",
						sourceProcessKey: processCode,
					},
				},
				include: { operation: true },
			});

			if (!operation) {
				const existingOperation = await tx.operation.findUnique({
					where: { code: processCode },
				});
				if (existingOperation) {
					operation = await tx.operationMapping.create({
						data: {
							sourceSystem: "ERP",
							sourceProcessKey: processCode,
							sourceProcessName: processName,
							operationId: existingOperation.id,
						},
						include: { operation: true },
					});
				} else {
					const createdOperation = await tx.operation.create({
						data: {
							code: processCode,
							name: processName,
							defaultType: StationType.MANUAL,
						},
					});
					operation = await tx.operationMapping.create({
						data: {
							sourceSystem: "ERP",
							sourceProcessKey: processCode,
							sourceProcessName: processName,
							operationId: createdOperation.id,
						},
						include: { operation: true },
					});
				}
			}

			if (step.workCenterCode || step.departmentCode) {
				await tx.workCenterStationGroupMapping.upsert({
					where: {
						sourceSystem_sourceWorkCenter_sourceDepartment: {
							sourceSystem: "ERP",
							sourceWorkCenter: step.workCenterCode || null,
							sourceDepartment: step.departmentCode || null,
						},
					},
					update: {
						meta: {
							workCenterName: step.workCenterName,
							departmentName: step.departmentName,
						},
					},
					create: {
						sourceSystem: "ERP",
						sourceWorkCenter: step.workCenterCode || null,
						sourceDepartment: step.departmentCode || null,
						meta: {
							workCenterName: step.workCenterName,
							departmentName: step.departmentName,
						},
					},
				});
			}

			const sourceStepKey = buildSourceStepKey(route.header.routeNo, step.stepNo, processCode);
			const stationType = operation.operation.defaultType ?? StationType.MANUAL;

			await tx.erpRouteLineRaw.create({
				data: {
					sourceSystem: "ERP",
					sourceKey: route.header.routeNo,
					lineNo: step.stepNo,
					payload: step,
					dedupeKey,
				},
			});

			await tx.routingStep.upsert({
				where: {
					routingId_stepNo: {
						routingId: routing.id,
						stepNo: step.stepNo,
					},
				},
				update: {
					operationId: operation.operationId,
					sourceStepKey,
					stationType,
					meta: {
						erp: {
							processCode,
							processName,
							workCenterCode: step.workCenterCode,
							workCenterName: step.workCenterName,
							departmentCode: step.departmentCode,
							departmentName: step.departmentName,
							description: step.description,
							keyOper: step.keyOper,
							firstPieceInspect: step.firstPieceInspect,
							processRecordStation: step.processRecordStation,
							qualityInspectStation: step.qualityInspectStation,
						},
					},
				},
				create: {
					routingId: routing.id,
					stepNo: step.stepNo,
					sourceStepKey,
					operationId: operation.operationId,
					stationType,
					meta: {
						erp: {
							processCode,
							processName,
							workCenterCode: step.workCenterCode,
							workCenterName: step.workCenterName,
							departmentCode: step.departmentCode,
							departmentName: step.departmentName,
							description: step.description,
							keyOper: step.keyOper,
							firstPieceInspect: step.firstPieceInspect,
							processRecordStation: step.processRecordStation,
							qualityInspectStation: step.qualityInspectStation,
						},
					},
				},
			});
		}

		if (stepNos.length > 0) {
			const maxStep = Math.max(...stepNos);
			await tx.routingStep.updateMany({
				where: { routingId: routing.id, stepNo: { in: stepNos, not: maxStep } },
				data: { isLast: false },
			});
			await tx.routingStep.updateMany({
				where: { routingId: routing.id, stepNo: maxStep },
				data: { isLast: true },
			});
			await tx.routingStep.deleteMany({
				where: {
					routingId: routing.id,
					stepNo: { notIn: stepNos },
				},
			});
		}
	}
};

export const syncErpRoutes = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpRoute>>> => {
	const sourceSystem = "ERP";
	const entityType = "ROUTING";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const cursorMeta = parseCursorMeta(cursor?.meta ?? null);
	const startRow = options.startRow ?? cursorMeta?.nextStartRow ?? 0;
	const limit = options.limit ?? 200;
	const since = options.since ?? cursorMeta?.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const businessKey = buildBusinessKey(sourceSystem, entityType, since, startRow, limit);

	const existing = await db.integrationMessage.findFirst({
		where: {
			direction: "IN",
			system: sourceSystem,
			entityType,
			businessKey,
			status: "SUCCESS",
		},
		orderBy: { createdAt: "desc" },
	});

	if (existing?.payload && typeof existing.payload === "object") {
		if (!isEnvelope(existing.payload)) {
			// fall through to refresh if payload doesn't match expected envelope
		} else {
			return {
				success: true,
				data: {
					payload: existing.payload,
					messageId: existing.id,
					businessKey,
					dedupeKey: existing.dedupeKey,
				},
			};
		}
	}

	const pullResult = await pullErpRoutes({
		since: since ?? undefined,
		startRow,
		limit,
	});

	if (!pullResult.success) {
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				status: "FAILED",
				payload: {
					request: { since, startRow, limit },
					error: { code: pullResult.code, message: pullResult.message },
				},
				error: pullResult.message,
			},
		});
		return pullResult;
	}

	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(pullResult.data)}`;
	const nextSyncAt = resolveSyncTimestamp(pullResult.data.cursor.nextSyncAt);
	const hasMore = pullResult.data.cursor.hasMore;
	const nextStartRow = startRow + limit;

	const syncResult = await db.$transaction(async (tx) => {
		const duplicate = await tx.integrationMessage.findFirst({
			where: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				dedupeKey,
				status: "SUCCESS",
			},
			orderBy: { createdAt: "desc" },
		});

		if (!hasMore) {
			await tx.integrationSyncCursor.upsert({
				where: { sourceSystem_entityType: { sourceSystem, entityType } },
				create: {
					sourceSystem,
					entityType,
					lastSyncAt: nextSyncAt,
					meta: null,
				},
				update: {
					lastSyncAt: nextSyncAt ?? undefined,
					meta: null,
				},
			});
		} else {
			await tx.integrationSyncCursor.upsert({
				where: { sourceSystem_entityType: { sourceSystem, entityType } },
				create: {
					sourceSystem,
					entityType,
					lastSyncAt: cursor?.lastSyncAt ?? null,
					meta: {
						nextStartRow,
						since,
					},
				},
				update: {
					meta: {
						nextStartRow,
						since,
					},
				},
			});
		}

		if (duplicate?.payload && isEnvelope(duplicate.payload)) {
			return {
				payload: duplicate.payload,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		if (pullResult.data.items.length > 0) {
			await normalizeErpRoutes(tx, pullResult.data.items, dedupeKey);
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: pullResult.data,
			},
			select: { id: true, dedupeKey: true },
		});

		return {
			payload: pullResult.data,
			messageId: message.id,
			dedupeKey: message.dedupeKey,
		};
	});

	return {
		success: true,
		data: {
			payload: syncResult.payload,
			messageId: syncResult.messageId,
			businessKey,
			dedupeKey: syncResult.dedupeKey,
		},
	};
};
