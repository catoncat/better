import type { Prisma, PrismaClient } from "@better-app/db";
import { ReadinessCheckType } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

type TraceMode = "run" | "latest";

type SnapshotStep = {
	stepNo: number;
	operationId: string;
	stationType: string;
	stationGroupId: string | null;
	allowedStationIds?: string[];
	requiresFAI?: boolean;
	requiresAuthorization?: boolean;
	dataSpecIds?: string[];
};

const toIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const toOptionalString = (value: unknown) => (typeof value === "string" ? value : null);

const getRepairRecord = (meta: Prisma.JsonValue | null | undefined) => {
	if (!isRecord(meta)) return null;
	const record = meta.repairRecordV1;
	if (!isRecord(record)) return null;
	const action = toOptionalString(record.action);
	const result = toOptionalString(record.result);
	const recordedAt = toOptionalString(record.recordedAt);
	if (!action || !result || !recordedAt) return null;
	return {
		action,
		result,
		recordedAt,
		recordedBy: toOptionalString(record.recordedBy),
		reason: toOptionalString(record.reason),
		remark: toOptionalString(record.remark),
	};
};

const toStringArray = (value: unknown) =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;

const resolveDataValue = (value: {
	valueNumber?: number | null;
	valueText?: string | null;
	valueBoolean?: boolean | null;
	valueJson?: Prisma.JsonValue | null;
}) => {
	if (value.valueNumber !== null && value.valueNumber !== undefined) return value.valueNumber;
	if (value.valueText !== null && value.valueText !== undefined) return value.valueText;
	if (value.valueBoolean !== null && value.valueBoolean !== undefined) return value.valueBoolean;
	if (value.valueJson !== null && value.valueJson !== undefined) return value.valueJson;
	return null;
};

const getSnapshotRoute = (snapshot: Prisma.JsonValue | null | undefined) => {
	if (!snapshot || typeof snapshot !== "object") return null;
	const record = snapshot as {
		route?: { code?: string; sourceSystem?: string; sourceKey?: string | null };
	};
	if (!record.route?.code || !record.route?.sourceSystem) return null;
	return {
		code: record.route.code,
		sourceSystem: record.route.sourceSystem,
		sourceKey: record.route.sourceKey ?? null,
	};
};

const getSnapshotSteps = (snapshot: Prisma.JsonValue | null | undefined): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];
	return record.steps.filter((step): step is SnapshotStep => !!step && typeof step === "object");
};

export const getUnitTrace = async (
	db: PrismaClient,
	sn: string,
	mode: TraceMode,
): Promise<
	ServiceResult<{
		unit: {
			sn: string;
			status: string;
			woNo: string;
			runNo: string | null;
		};
		route: {
			code: string;
			sourceSystem: string;
			sourceKey: string | null;
		};
		routeVersion: {
			id: string;
			versionNo: number;
			compiledAt: string;
		};
		steps: Array<{
			stepNo: number;
			operationId: string;
			stationType: string;
			stationGroupId: string | null;
			allowedStationIds: string[];
			requiresFAI: boolean;
			requiresAuthorization: boolean;
			dataSpecIds: string[];
		}>;
		tracks: Array<{
			stepNo: number;
			operation: string | null;
			inAt: string | null;
			outAt: string | null;
			result: string | null;
		}>;
		ingestEvents: Array<{
			id: string;
			eventType: string;
			sourceSystem: string;
			dedupeKey: string;
			occurredAt: string;
			stationCode: string | null;
			lineCode: string | null;
			carrierCode: string | null;
			sn: string | null;
			snList: string[] | null;
			result: string | null;
			links: {
				carrierId: string | null;
				carrierTrackId: string | null;
				carrierDataValueCount: number | null;
				unitTracks: Record<string, string> | null;
			} | null;
		}>;
		carrierTracks: Array<{
			id: string;
			carrierNo: string;
			stepNo: number;
			stationCode: string | null;
			inAt: string | null;
			outAt: string | null;
			result: string | null;
			source: string;
			dataValueCount: number;
		}>;
		carrierLoads: Array<{
			id: string;
			carrierNo: string;
			loadedAt: string;
			unloadedAt: string | null;
		}>;
		carrierDataValues: Array<{
			carrierTrackId: string | null;
			carrierNo: string | null;
			stepNo: number | null;
			name: string;
			value: Prisma.JsonValue | string | number | boolean | null;
			valueNumber: number | null;
			valueText: string | null;
			valueBoolean: boolean | null;
			valueJson: Prisma.JsonValue | null;
			judge: string | null;
		}>;
		dataValues: Array<{
			stepNo: number | null;
			name: string;
			value: Prisma.JsonValue | string | number | boolean | null;
			valueNumber: number | null;
			valueText: string | null;
			valueBoolean: boolean | null;
			valueJson: Prisma.JsonValue | null;
			judge: string | null;
		}>;
		defects: Array<{
			id: string;
			code: string;
			location: string | null;
			qty: number;
			status: string;
			disposition: {
				type: string;
				reason: string | null;
				reworkTask: {
					id: string;
					status: string;
					doneAt: string | null;
					doneBy: string | null;
					repairRecord: {
						action: string;
						result: string;
						recordedAt: string;
						recordedBy: string | null;
						reason: string | null;
						remark: string | null;
					} | null;
				} | null;
			} | null;
		}>;
		inspections: Array<{
			id: string;
			type: string;
			status: string;
			startedAt: string | null;
			inspectorId: string | null;
			decidedAt: string | null;
			decidedBy: string | null;
			remark: string | null;
			unitItems: { pass: number; fail: number; na: number };
		}>;
		loadingRecords: Array<{
			id: string;
			slotCode: string;
			slotName: string | null;
			position: number;
			materialCode: string;
			lotNo: string;
			status: string;
			verifyResult: string;
			loadedAt: string;
			loadedBy: string;
			unloadedAt: string | null;
			unloadedBy: string | null;
		}>;
		materials: Array<{
			position: string | null;
			materialCode: string;
			lotNo: string;
			isKeyPart: boolean;
		}>;
		readiness: {
			status: string;
			checkedAt: string;
			checkedBy: string | null;
			waivedItems: Array<{
				itemType: string;
				itemKey: string;
				failReason: string | null;
				evidenceJson: Prisma.JsonValue | null;
				waivedAt: string | null;
				waivedBy: string | null;
				waiveReason: string | null;
				source: "WAIVE";
			}>;
		} | null;
		snapshot: Record<string, unknown>;
	}>
> => {
	const unit = await db.unit.findUnique({
		where: { sn },
		include: {
			workOrder: { include: { routing: true } },
			run: { include: { routeVersion: true } },
		},
	});

	if (!unit) {
		return { success: false, code: "UNIT_NOT_FOUND", message: "Unit not found", status: 404 };
	}

	let routeVersion = unit.run?.routeVersion ?? null;
	if (mode === "latest") {
		if (!unit.workOrder.routingId) {
			return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
		}
		routeVersion = await db.executableRouteVersion.findFirst({
			where: { routingId: unit.workOrder.routingId, status: "READY" },
			orderBy: { versionNo: "desc" },
		});
	}

	if (!routeVersion) {
		return {
			success: false,
			code: "ROUTE_VERSION_NOT_READY",
			message: "Executable route version not available",
			status: 404,
		};
	}

	const snapshotRoute = getSnapshotRoute(routeVersion.snapshotJson);
	const steps = getSnapshotSteps(routeVersion.snapshotJson);

	if (steps.length === 0) {
		return {
			success: false,
			code: "ROUTING_EMPTY",
			message: "Route snapshot has no steps",
			status: 400,
		};
	}

	const route = snapshotRoute ?? {
		code: unit.workOrder.routing?.code ?? "",
		sourceSystem: unit.workOrder.routing?.sourceSystem ?? "MES",
		sourceKey: unit.workOrder.routing?.sourceKey ?? null,
	};

	const tracks = await db.track.findMany({
		where: { unitId: unit.id },
		orderBy: { inAt: "asc" },
		select: {
			id: true,
			stepNo: true,
			inAt: true,
			outAt: true,
			result: true,
		},
	});

	const trackIds = tracks.map((track) => track.id);
	const trackById = new Map(tracks.map((track) => [track.id, track]));

	const stepByNo = new Map(steps.map((step) => [step.stepNo, step]));
	const operationIds = [...new Set(steps.map((step) => step.operationId).filter((value) => value))];
	const operations = operationIds.length
		? await db.operation.findMany({
				where: { id: { in: operationIds } },
				select: { id: true, code: true },
			})
		: [];
	const operationById = new Map(operations.map((operation) => [operation.id, operation.code]));

	const dataValues = trackIds.length
		? await db.dataValue.findMany({
				where: { trackId: { in: trackIds } },
				include: { spec: true },
			})
		: [];

	const ingestEventFilters: Prisma.IngestEventWhereInput[] = [{ unitId: unit.id }, { sn: unit.sn }];
	if (unit.runId) {
		ingestEventFilters.push({ runId: unit.runId });
	}

	const ingestEvents = await db.ingestEvent.findMany({
		where: { OR: ingestEventFilters },
		orderBy: { occurredAt: "asc" },
		select: {
			id: true,
			eventType: true,
			sourceSystem: true,
			dedupeKey: true,
			occurredAt: true,
			stationCode: true,
			lineCode: true,
			carrierCode: true,
			sn: true,
			snList: true,
			result: true,
			meta: true,
		},
	});

	const ingestEventsWithLinks = ingestEvents.map((event) => {
		const meta = event.meta;
		const metaLinks = isRecord(meta) ? (meta as Record<string, unknown>).links : null;
		const links = isRecord(metaLinks)
			? {
					carrierId: typeof metaLinks.carrierId === "string" ? metaLinks.carrierId : null,
					carrierTrackId:
						typeof metaLinks.carrierTrackId === "string" ? metaLinks.carrierTrackId : null,
					carrierDataValueCount:
						typeof metaLinks.carrierDataValueCount === "number"
							? metaLinks.carrierDataValueCount
							: null,
					unitTracks: isRecord(metaLinks.unitTracks)
						? (Object.fromEntries(
								Object.entries(metaLinks.unitTracks).filter(
									([, value]) => typeof value === "string",
								),
							) as Record<string, string>)
						: null,
				}
			: null;

		return {
			...event,
			snList: toStringArray(event.snList),
			links,
		};
	});

	const relevantCarrierTrackIds = new Set<string>();
	for (const event of ingestEventsWithLinks) {
		if (event.eventType !== "BATCH") continue;
		const carrierTrackId = event.links?.carrierTrackId;
		if (!carrierTrackId) continue;

		const snList = event.snList ?? [];
		const unitTracks = event.links?.unitTracks;
		const isRelevant =
			snList.includes(unit.sn) || (unitTracks ? Object.hasOwn(unitTracks, unit.sn) : false);

		if (isRelevant) {
			relevantCarrierTrackIds.add(carrierTrackId);
		}
	}

	const carrierTrackIds = [...relevantCarrierTrackIds];
	const carrierTracks = carrierTrackIds.length
		? await db.carrierTrack.findMany({
				where: { id: { in: carrierTrackIds } },
				orderBy: { inAt: "asc" },
				select: {
					id: true,
					stepNo: true,
					stationId: true,
					source: true,
					inAt: true,
					outAt: true,
					result: true,
					carrier: { select: { carrierNo: true } },
					station: { select: { code: true } },
				},
			})
		: [];

	const carrierTrackById = new Map(carrierTracks.map((track) => [track.id, track]));

	const carrierDataValues = carrierTrackIds.length
		? await db.dataValue.findMany({
				where: { carrierTrackId: { in: carrierTrackIds } },
				orderBy: { collectedAt: "asc" },
				include: { spec: true },
			})
		: [];

	const carrierDataValueCountByTrackId = new Map<string, number>();
	for (const value of carrierDataValues) {
		if (!value.carrierTrackId) continue;
		carrierDataValueCountByTrackId.set(
			value.carrierTrackId,
			(carrierDataValueCountByTrackId.get(value.carrierTrackId) ?? 0) + 1,
		);
	}

	const defects = await db.defect.findMany({
		where: { unitId: unit.id },
		include: { disposition: { include: { reworkTask: true } } },
	});

	const inspections = unit.runId
		? await db.inspection.findMany({
				where: { runId: unit.runId },
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					type: true,
					status: true,
					startedAt: true,
					inspectorId: true,
					decidedAt: true,
					decidedBy: true,
					remark: true,
				},
			})
		: [];

	const inspectionItems = unit.runId
		? await db.inspectionItem.findMany({
				where: { unitSn: unit.sn, inspection: { runId: unit.runId } },
				select: { inspectionId: true, result: true },
			})
		: [];

	const unitItemSummaryByInspectionId = new Map<
		string,
		{ pass: number; fail: number; na: number }
	>();
	for (const item of inspectionItems) {
		const current = unitItemSummaryByInspectionId.get(item.inspectionId) ?? {
			pass: 0,
			fail: 0,
			na: 0,
		};
		if (item.result === "PASS") current.pass += 1;
		else if (item.result === "FAIL") current.fail += 1;
		else current.na += 1;
		unitItemSummaryByInspectionId.set(item.inspectionId, current);
	}

	let earliestInAt: Date | null = null;
	let latestOutAt: Date | null = null;
	for (const track of tracks) {
		if (track.inAt) {
			if (!earliestInAt || track.inAt < earliestInAt) earliestInAt = track.inAt;
			const outAt = track.outAt ?? track.inAt;
			if (!latestOutAt || outAt > latestOutAt) latestOutAt = outAt;
		}
	}

	const carrierLoads = await db.carrierLoad.findMany({
		where: {
			unitId: unit.id,
			...(earliestInAt && latestOutAt
				? {
						AND: [
							{ loadedAt: { lte: latestOutAt } },
							{ OR: [{ unloadedAt: null }, { unloadedAt: { gte: earliestInAt } }] },
						],
					}
				: {}),
		},
		orderBy: { loadedAt: "asc" },
		select: {
			id: true,
			loadedAt: true,
			unloadedAt: true,
			carrier: { select: { carrierNo: true } },
		},
	});

	const loadingRecords = unit.runId
		? await db.loadingRecord.findMany({
				where: {
					runId: unit.runId,
					...(earliestInAt && latestOutAt
						? {
								AND: [
									{ loadedAt: { lte: latestOutAt } },
									{
										OR: [{ unloadedAt: null }, { unloadedAt: { gte: earliestInAt } }],
									},
								],
							}
						: {}),
				},
				orderBy: { loadedAt: "asc" },
				select: {
					id: true,
					status: true,
					verifyResult: true,
					loadedAt: true,
					loadedBy: true,
					unloadedAt: true,
					unloadedBy: true,
					slot: { select: { slotCode: true, slotName: true, position: true } },
					materialLot: { select: { lotNo: true, materialCode: true } },
				},
			})
		: [];

	const materials = await db.materialUse.findMany({
		where: { unitId: unit.id },
		include: { materialLot: true },
	});

	let readiness = null;
	if (unit.runId) {
		const check = await db.readinessCheck.findFirst({
			where: { runId: unit.runId, type: ReadinessCheckType.FORMAL },
			orderBy: { checkedAt: "desc" },
			include: { items: true },
		});
		if (check) {
			const waivedItems = check.items
				.filter((i) => i.status === "WAIVED")
				.map((i) => ({
					itemType: i.itemType,
					itemKey: i.itemKey,
					failReason: i.failReason ?? null,
					evidenceJson: i.evidenceJson,
					waivedAt: toIso(i.waivedAt),
					waivedBy: i.waivedBy,
					waiveReason: i.waiveReason,
					source: "WAIVE" as const,
				}));
			readiness = {
				status: check.status,
				checkedAt: check.checkedAt.toISOString(),
				checkedBy: check.checkedBy ?? null,
				waivedItems,
			};
		}
	}

	return {
		success: true,
		data: {
			unit: {
				sn: unit.sn,
				status: unit.status,
				woNo: unit.workOrder.woNo,
				runNo: unit.run?.runNo ?? null,
			},
			route,
			routeVersion: {
				id: routeVersion.id,
				versionNo: routeVersion.versionNo,
				compiledAt: routeVersion.compiledAt.toISOString(),
			},
			steps: steps.map((step) => ({
				stepNo: step.stepNo,
				operationId: step.operationId,
				stationType: step.stationType,
				stationGroupId: step.stationGroupId ?? null,
				allowedStationIds: step.allowedStationIds ?? [],
				requiresFAI: step.requiresFAI ?? false,
				requiresAuthorization: step.requiresAuthorization ?? false,
				dataSpecIds: step.dataSpecIds ?? [],
			})),
			tracks: tracks.map((track) => {
				const step = stepByNo.get(track.stepNo);
				return {
					stepNo: track.stepNo,
					operation: step ? (operationById.get(step.operationId) ?? step.operationId) : null,
					inAt: toIso(track.inAt),
					outAt: toIso(track.outAt),
					result: track.result ?? null,
				};
			}),
			ingestEvents: ingestEventsWithLinks.map((event) => ({
				id: event.id,
				eventType: event.eventType,
				sourceSystem: event.sourceSystem,
				dedupeKey: event.dedupeKey,
				occurredAt: event.occurredAt.toISOString(),
				stationCode: event.stationCode ?? null,
				lineCode: event.lineCode ?? null,
				carrierCode: event.carrierCode ?? null,
				sn: event.sn ?? null,
				snList: event.snList,
				result: event.result ?? null,
				links: event.links,
			})),
			carrierTracks: carrierTracks.map((track) => ({
				id: track.id,
				carrierNo: track.carrier.carrierNo,
				stepNo: track.stepNo,
				stationCode: track.station?.code ?? null,
				inAt: toIso(track.inAt),
				outAt: toIso(track.outAt),
				result: track.result ?? null,
				source: track.source,
				dataValueCount: carrierDataValueCountByTrackId.get(track.id) ?? 0,
			})),
			carrierLoads: carrierLoads.map((load) => ({
				id: load.id,
				carrierNo: load.carrier.carrierNo,
				loadedAt: load.loadedAt.toISOString(),
				unloadedAt: toIso(load.unloadedAt),
			})),
			carrierDataValues: carrierDataValues.map((value) => {
				const track = value.carrierTrackId ? carrierTrackById.get(value.carrierTrackId) : null;
				return {
					carrierTrackId: value.carrierTrackId ?? null,
					carrierNo: track?.carrier.carrierNo ?? null,
					stepNo: track?.stepNo ?? null,
					name: value.spec.name,
					value: resolveDataValue(value),
					valueNumber: value.valueNumber ?? null,
					valueText: value.valueText ?? null,
					valueBoolean: value.valueBoolean ?? null,
					valueJson: value.valueJson ?? null,
					judge: value.judge ?? null,
				};
			}),
			dataValues: dataValues.map((value) => ({
				stepNo: value.trackId ? (trackById.get(value.trackId)?.stepNo ?? null) : null,
				name: value.spec.name,
				value: resolveDataValue(value),
				valueNumber: value.valueNumber ?? null,
				valueText: value.valueText ?? null,
				valueBoolean: value.valueBoolean ?? null,
				valueJson: value.valueJson ?? null,
				judge: value.judge ?? null,
			})),
			defects: defects.map((defect) => ({
				id: defect.id,
				code: defect.code,
				location: defect.location ?? null,
				qty: defect.qty,
				status: defect.status,
				disposition: defect.disposition
					? {
							type: defect.disposition.type,
							reason: defect.disposition.reason ?? null,
							reworkTask: defect.disposition.reworkTask
								? {
										id: defect.disposition.reworkTask.id,
										status: defect.disposition.reworkTask.status,
										doneAt: toIso(defect.disposition.reworkTask.doneAt),
										doneBy: defect.disposition.reworkTask.doneBy ?? null,
										repairRecord: getRepairRecord(defect.disposition.reworkTask.meta),
									}
								: null,
						}
					: null,
			})),
			inspections: inspections.map((inspection) => ({
				id: inspection.id,
				type: inspection.type,
				status: inspection.status,
				startedAt: toIso(inspection.startedAt),
				inspectorId: inspection.inspectorId ?? null,
				decidedAt: toIso(inspection.decidedAt),
				decidedBy: inspection.decidedBy ?? null,
				remark: inspection.remark ?? null,
				unitItems: unitItemSummaryByInspectionId.get(inspection.id) ?? { pass: 0, fail: 0, na: 0 },
			})),
			loadingRecords: loadingRecords.map((record) => ({
				id: record.id,
				slotCode: record.slot.slotCode,
				slotName: record.slot.slotName,
				position: record.slot.position,
				materialCode: record.materialLot.materialCode,
				lotNo: record.materialLot.lotNo,
				status: record.status,
				verifyResult: record.verifyResult,
				loadedAt: record.loadedAt.toISOString(),
				loadedBy: record.loadedBy,
				unloadedAt: toIso(record.unloadedAt),
				unloadedBy: record.unloadedBy ?? null,
			})),
			materials: materials.map((use) => ({
				position: use.position ?? null,
				materialCode: use.materialLot.materialCode,
				lotNo: use.materialLot.lotNo,
				isKeyPart: use.isKeyPart,
			})),
			readiness,
			snapshot: {
				material_trace: {},
				process_info: {},
				inspection_results: {},
				repair_history: {},
			},
		},
	};
};
