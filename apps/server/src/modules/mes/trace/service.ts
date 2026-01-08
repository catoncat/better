import type { Prisma, PrismaClient } from "@better-app/db";
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
		}>;
		materials: Array<{
			position: string | null;
			materialCode: string;
			lotNo: string;
			isKeyPart: boolean;
		}>;
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

	const defects = await db.defect.findMany({
		where: { unitId: unit.id },
	});

	const materials = await db.materialUse.findMany({
		where: { unitId: unit.id },
		include: { materialLot: true },
	});

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
			})),
			materials: materials.map((use) => ({
				position: use.position ?? null,
				materialCode: use.materialLot.materialCode,
				lotNo: use.materialLot.lotNo,
				isKeyPart: use.isKeyPart,
			})),
			snapshot: {
				material_trace: {},
				process_info: {},
				inspection_results: {},
				repair_history: {},
			},
		},
	};
};
