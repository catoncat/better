import { Prisma, type PrismaClient, StationType } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	executionConfigCreateSchema,
	executionConfigUpdateSchema,
	routeListQuerySchema,
} from "./schema";

type ExecutionConfigCreateInput = Static<typeof executionConfigCreateSchema>;
type ExecutionConfigUpdateInput = Static<typeof executionConfigUpdateSchema>;
type RouteListQuery = Static<typeof routeListQuerySchema>;

type ExecutionConfig = Prisma.RouteExecutionConfigGetPayload<{
	include: {
		routing: true;
		routingStep: true;
		operation: true;
		stationGroup: true;
	};
}>;
type ExecutableRouteVersionRecord =
	Prisma.ExecutableRouteVersionGetPayload<Prisma.ExecutableRouteVersionDefaultArgs>;

type StepConfig = {
	stepNo: number;
	operationId: string;
	sourceStepKey: string | null;
	stationType: StationType;
	stationGroupId: string | null;
	requiresFAI: boolean;
};

type CompiledStep = {
	stepNo: number;
	operationId: string;
	stationType: StationType;
	stationGroupId: string | null;
	allowedStationIds: string[];
	requiresFAI: boolean;
	requiresAuthorization: boolean;
	dataSpecIds: string[];
	ingestMapping: Prisma.JsonValue | null;
};

type CompileError = {
	stepNo?: number;
	code: string;
	message: string;
};

const toStringArray = (value: Prisma.JsonValue | null | undefined) => {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
};

const pickLatest = (items: ExecutionConfig[]) => {
	if (items.length === 0) return null;
	return items.slice().sort((a, b) => {
		const timeDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
		if (timeDiff !== 0) return timeDiff;
		return b.id.localeCompare(a.id);
	})[0];
};

const buildSnapshotSignature = (snapshot: { route: unknown; steps: unknown }) =>
	JSON.stringify(snapshot, (_key, value) => (value === undefined ? null : value));

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

const toOptionalJsonValue = (value: unknown) => {
	if (value === undefined) return undefined;
	if (value === null) return Prisma.DbNull;
	return toJsonValue(value);
};

const extractSnapshotSignature = (snapshotJson: Prisma.JsonValue | null | undefined) => {
	if (!snapshotJson || typeof snapshotJson !== "object") return null;
	const snapshot = snapshotJson as { route?: unknown; steps?: unknown };
	if (!snapshot.route || !snapshot.steps) return null;
	return buildSnapshotSignature({ route: snapshot.route, steps: snapshot.steps });
};

const validateScope = (input: ExecutionConfigCreateInput) => {
	switch (input.scopeType) {
		case "ROUTE":
			return null;
		case "STEP":
			return input.stepNo === undefined ? "STEP_NO_REQUIRED" : null;
		default:
			return "SCOPE_TYPE_INVALID";
	}
};

type StationGroupResult = { id: string | null | undefined } | { error: "STATION_GROUP_NOT_FOUND" };

const resolveStationGroupId = async (
	db: PrismaClient,
	stationGroupCode?: string | null,
): Promise<StationGroupResult> => {
	if (stationGroupCode === undefined) return { id: undefined };
	if (stationGroupCode === null) return { id: null };
	const stationGroup = await db.stationGroup.findUnique({ where: { code: stationGroupCode } });
	if (!stationGroup) {
		return { error: "STATION_GROUP_NOT_FOUND" as const };
	}
	return { id: stationGroup.id };
};

export const listExecutionConfigs = async (
	db: PrismaClient,
	routingCode: string,
): Promise<ServiceResult<{ items: ExecutionConfig[] }>> => {
	const routing = await db.routing.findUnique({
		where: { code: routingCode },
		include: { steps: true },
	});
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	const stepIds = routing.steps.map((step) => step.id);
	const sourceStepKeys = routing.steps
		.map((step) => step.sourceStepKey)
		.filter((value): value is string => Boolean(value));

	const filters: Prisma.RouteExecutionConfigWhereInput[] = [{ routingId: routing.id }];
	if (stepIds.length > 0) filters.push({ routingStepId: { in: stepIds } });
	if (sourceStepKeys.length > 0) filters.push({ sourceStepKey: { in: sourceStepKeys } });

	const items = await db.routeExecutionConfig.findMany({
		where: {
			OR: filters,
		},
		include: {
			routing: true,
			routingStep: true,
			operation: true,
			stationGroup: true,
		},
		orderBy: [{ updatedAt: "desc" }],
	});

	return { success: true, data: { items } };
};

export const createExecutionConfig = async (
	db: PrismaClient,
	routingCode: string,
	input: ExecutionConfigCreateInput,
): Promise<ServiceResult<ExecutionConfig>> => {
	const scopeError = validateScope(input);
	if (scopeError) {
		return {
			success: false,
			code: scopeError,
			message: "Invalid execution config scope",
			status: 400,
		};
	}

	const routing = await db.routing.findUnique({
		where: { code: routingCode },
		include: { steps: true },
	});
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	let routingStepId: string | undefined;
	let sourceStepKey: string | undefined | null;

	if (input.scopeType === "STEP") {
		const step = routing.steps.find((item) => item.stepNo === input.stepNo);
		if (!step) {
			return {
				success: false,
				code: "ROUTE_STEP_NOT_FOUND",
				message: "Routing step not found",
				status: 404,
			};
		}
		routingStepId = step.id;
		sourceStepKey = step.sourceStepKey ?? null;
	}

	const stationGroupResult = await resolveStationGroupId(db, input.stationGroupCode);
	if ("error" in stationGroupResult) {
		return {
			success: false,
			code: stationGroupResult.error,
			message: "Station group not found",
			status: 404,
		};
	}

	const created = await db.routeExecutionConfig.create({
		data: {
			routingId: input.scopeType === "ROUTE" ? routing.id : undefined,
			routingStepId,
			sourceStepKey: sourceStepKey ?? undefined,
			stationType: input.stationType,
			stationGroupId: stationGroupResult.id,
			allowedStationIds: toOptionalJsonValue(input.allowedStationIds),
			requiresFAI: input.requiresFAI,
			requiresAuthorization: input.requiresAuthorization,
			dataSpecIds: toOptionalJsonValue(input.dataSpecIds),
			ingestMapping: toOptionalJsonValue(input.ingestMapping),
			meta: toOptionalJsonValue(input.meta),
		},
		include: {
			routing: true,
			routingStep: true,
			operation: true,
			stationGroup: true,
		},
	});

	return { success: true, data: created };
};

export const updateExecutionConfig = async (
	db: PrismaClient,
	routingCode: string,
	configId: string,
	input: ExecutionConfigUpdateInput,
): Promise<ServiceResult<ExecutionConfig>> => {
	const routing = await db.routing.findUnique({
		where: { code: routingCode },
		include: { steps: true },
	});
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	const config = await db.routeExecutionConfig.findUnique({
		where: { id: configId },
	});
	if (!config) {
		return {
			success: false,
			code: "EXECUTION_CONFIG_NOT_FOUND",
			message: "Execution config not found",
			status: 404,
		};
	}

	const stepIds = new Set(routing.steps.map((step) => step.id));
	const operationIds = new Set(routing.steps.map((step) => step.operationId));
	const sourceStepKeys = new Set(
		routing.steps
			.map((step) => step.sourceStepKey)
			.filter((value): value is string => Boolean(value)),
	);

	const belongsToRoute =
		config.routingId === routing.id ||
		(config.routingStepId && stepIds.has(config.routingStepId)) ||
		(config.operationId && operationIds.has(config.operationId)) ||
		(config.sourceStepKey && sourceStepKeys.has(config.sourceStepKey));

	if (!belongsToRoute) {
		return {
			success: false,
			code: "EXECUTION_CONFIG_SCOPE_MISMATCH",
			message: "Config not in routing",
			status: 400,
		};
	}

	const stationGroupResult = await resolveStationGroupId(db, input.stationGroupCode);
	if ("error" in stationGroupResult) {
		return {
			success: false,
			code: stationGroupResult.error,
			message: "Station group not found",
			status: 404,
		};
	}

	const data: Prisma.RouteExecutionConfigUncheckedUpdateInput = {};
	if (input.stationType !== undefined) data.stationType = input.stationType;
	if (stationGroupResult.id !== undefined) data.stationGroupId = stationGroupResult.id;
	if (input.allowedStationIds !== undefined)
		data.allowedStationIds = toOptionalJsonValue(input.allowedStationIds);
	if (input.requiresFAI !== undefined) data.requiresFAI = input.requiresFAI;
	if (input.requiresAuthorization !== undefined)
		data.requiresAuthorization = input.requiresAuthorization;
	if (input.dataSpecIds !== undefined) data.dataSpecIds = toOptionalJsonValue(input.dataSpecIds);
	if (input.ingestMapping !== undefined)
		data.ingestMapping = toOptionalJsonValue(input.ingestMapping);
	if (input.meta !== undefined) data.meta = toOptionalJsonValue(input.meta);

	const updated = await db.routeExecutionConfig.update({
		where: { id: configId },
		data,
		include: {
			routing: true,
			routingStep: true,
			operation: true,
			stationGroup: true,
		},
	});

	return { success: true, data: updated };
};

export const compileRouteExecution = async (
	db: PrismaClient,
	routingCode: string,
): Promise<ServiceResult<ExecutableRouteVersionRecord>> => {
	const routing = await db.routing.findUnique({
		where: { code: routingCode },
		include: { steps: { include: { operation: true } } },
	});
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	const steps = routing.steps
		.slice()
		.sort((a, b) => a.stepNo - b.stepNo)
		.map<StepConfig>((step) => ({
			stepNo: step.stepNo,
			operationId: step.operationId,
			sourceStepKey: step.sourceStepKey ?? null,
			stationType: step.stationType,
			stationGroupId: step.stationGroupId,
			requiresFAI: step.requiresFAI,
		}));

	if (steps.length === 0) {
		return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps", status: 400 };
	}

	const stepIds = routing.steps.map((step) => step.id);
	const sourceStepKeys = routing.steps
		.map((step) => step.sourceStepKey)
		.filter((value): value is string => Boolean(value));

	const configFilters: Prisma.RouteExecutionConfigWhereInput[] = [{ routingId: routing.id }];
	if (stepIds.length > 0) configFilters.push({ routingStepId: { in: stepIds } });
	if (sourceStepKeys.length > 0) configFilters.push({ sourceStepKey: { in: sourceStepKeys } });

	const configs = await db.routeExecutionConfig.findMany({
		where: { OR: configFilters },
		include: {
			routing: true,
			routingStep: true,
			operation: true,
			stationGroup: true,
		},
	});

	const errors: CompileError[] = [];
	const compiledSteps: CompiledStep[] = [];
	const stepIdByNo = new Map(routing.steps.map((step) => [step.stepNo, step.id]));

	const allDataSpecIds = new Set<string>();
	for (const config of configs) {
		for (const id of toStringArray(config.dataSpecIds as Prisma.JsonValue)) {
			allDataSpecIds.add(id);
		}
	}

	const dataSpecs =
		allDataSpecIds.size > 0
			? await db.dataCollectionSpec.findMany({
					where: { id: { in: Array.from(allDataSpecIds) } },
					select: { id: true, operationId: true },
				})
			: [];
	const dataSpecById = new Map(dataSpecs.map((spec) => [spec.id, spec]));

	const configsByStepId = new Map<string, ExecutionConfig[]>();
	const configsBySourceStepKey = new Map<string, ExecutionConfig[]>();
	const routeConfigs = configs.filter((config) => config.routingId === routing.id);

	for (const config of configs) {
		if (config.routingStepId) {
			const list = configsByStepId.get(config.routingStepId) ?? [];
			list.push(config);
			configsByStepId.set(config.routingStepId, list);
		}
		if (config.sourceStepKey) {
			const list = configsBySourceStepKey.get(config.sourceStepKey) ?? [];
			list.push(config);
			configsBySourceStepKey.set(config.sourceStepKey, list);
		}
	}

	for (const step of steps) {
		const stepId = stepIdByNo.get(step.stepNo);
		const stepConfigs = stepId ? (configsByStepId.get(stepId) ?? []) : [];
		const sourceConfigs = step.sourceStepKey
			? (configsBySourceStepKey.get(step.sourceStepKey) ?? [])
			: [];

		const stepConfig = pickLatest([...stepConfigs, ...sourceConfigs]);
		const routeConfig = pickLatest(routeConfigs);

		const stationType = stepConfig?.stationType ?? routeConfig?.stationType ?? step.stationType;
		const stationGroupId =
			stepConfig?.stationGroupId ?? routeConfig?.stationGroupId ?? step.stationGroupId ?? null;
		const allowedStationIds =
			stepConfig?.allowedStationIds ?? routeConfig?.allowedStationIds ?? null;
		const requiresFAI =
			stepConfig?.requiresFAI ?? routeConfig?.requiresFAI ?? step.requiresFAI ?? false;
		const requiresAuthorization =
			stepConfig?.requiresAuthorization ?? routeConfig?.requiresAuthorization ?? false;
		const dataSpecIds = stepConfig?.dataSpecIds ?? routeConfig?.dataSpecIds ?? null;
		const ingestMapping = stepConfig?.ingestMapping ?? routeConfig?.ingestMapping ?? null;

		if (!stationType) {
			errors.push({
				stepNo: step.stepNo,
				code: "STATION_TYPE_MISSING",
				message: "Station type is required",
			});
		}

		const allowedList = toStringArray(allowedStationIds as Prisma.JsonValue);
		if (!stationGroupId && allowedList.length === 0) {
			errors.push({
				stepNo: step.stepNo,
				code: "STATION_CONSTRAINT_MISSING",
				message: "Station group or allowed stations required",
			});
		}

		if (
			stationType === StationType.AUTO ||
			stationType === StationType.BATCH ||
			stationType === StationType.TEST
		) {
			if (!ingestMapping) {
				errors.push({
					stepNo: step.stepNo,
					code: "INGEST_MAPPING_MISSING",
					message: "Ingest mapping is required for AUTO/BATCH/TEST",
				});
			}
		}

		const dataSpecIdList = toStringArray(dataSpecIds as Prisma.JsonValue);
		if (dataSpecIdList.length > 0) {
			const missing = dataSpecIdList.filter((id) => !dataSpecById.has(id));
			if (missing.length > 0) {
				errors.push({
					stepNo: step.stepNo,
					code: "DATA_SPEC_NOT_FOUND",
					message: `Data specs not found: ${missing.join(", ")}`,
				});
			}

			const mismatched = dataSpecIdList.filter((id) => {
				const spec = dataSpecById.get(id);
				return spec ? spec.operationId !== step.operationId : false;
			});
			if (mismatched.length > 0) {
				errors.push({
					stepNo: step.stepNo,
					code: "DATA_SPEC_OPERATION_MISMATCH",
					message: `Data specs must belong to the step operation: ${mismatched.join(", ")}`,
				});
			}
		}

		compiledSteps.push({
			stepNo: step.stepNo,
			operationId: step.operationId,
			stationType: stationType ?? StationType.MANUAL,
			stationGroupId,
			allowedStationIds: allowedList,
			requiresFAI,
			requiresAuthorization,
			dataSpecIds: dataSpecIdList,
			ingestMapping: ingestMapping ?? null,
		});
	}

	const snapshotCore = {
		route: {
			code: routing.code,
			sourceSystem: routing.sourceSystem,
			sourceKey: routing.sourceKey,
		},
		steps: compiledSteps,
	};

	const signature = buildSnapshotSignature(snapshotCore);
	const latest = await db.executableRouteVersion.findFirst({
		where: { routingId: routing.id },
		orderBy: { versionNo: "desc" },
	});
	const latestSignature = latest ? extractSnapshotSignature(latest.snapshotJson) : null;

	const compiledAt = new Date();
	const isValid = errors.length === 0;
	const status = isValid ? "READY" : "INVALID";

	if (latest && latestSignature === signature) {
		if (isValid && latest.status === "READY") {
			return { success: true, data: latest };
		}
		if (!isValid && latest.status === "INVALID") {
			const previousErrors = Array.isArray(latest.errorsJson) ? latest.errorsJson : [];
			const sameErrors = JSON.stringify(previousErrors) === JSON.stringify(errors);
			if (sameErrors) {
				return { success: true, data: latest };
			}
		}
	}

	const versionNo = latest ? latest.versionNo + 1 : 1;
	const snapshotJson = {
		...snapshotCore,
		routeVersion: {
			versionNo,
			compiledAt: compiledAt.toISOString(),
		},
	};

	const version = await db.executableRouteVersion.create({
		data: {
			routingId: routing.id,
			versionNo,
			status,
			snapshotJson: toJsonValue(snapshotJson),
			errorsJson: errors.length > 0 ? toJsonValue(errors) : Prisma.DbNull,
			compiledAt,
		},
	});

	return { success: true, data: version };
};

export const listRouteVersions = async (
	db: PrismaClient,
	routingCode: string,
): Promise<ServiceResult<ExecutableRouteVersionRecord[]>> => {
	const routing = await db.routing.findUnique({ where: { code: routingCode } });
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	const versions = await db.executableRouteVersion.findMany({
		where: { routingId: routing.id },
		orderBy: { versionNo: "desc" },
	});

	return { success: true, data: versions };
};

export const getRouteVersion = async (
	db: PrismaClient,
	routingCode: string,
	versionNo: number,
): Promise<ServiceResult<ExecutableRouteVersionRecord>> => {
	const routing = await db.routing.findUnique({ where: { code: routingCode } });
	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	const version = await db.executableRouteVersion.findUnique({
		where: {
			routingId_versionNo: {
				routingId: routing.id,
				versionNo,
			},
		},
	});

	if (!version) {
		return {
			success: false,
			code: "ROUTE_VERSION_NOT_FOUND",
			message: "Route version not found",
			status: 404,
		};
	}

	return { success: true, data: version };
};

export const listRoutes = async (db: PrismaClient, query: RouteListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.RoutingWhereInput = {};

	if (query.search) {
		where.OR = [
			{ code: { contains: query.search } },
			{ name: { contains: query.search } },
			{ productCode: { contains: query.search } },
		];
	}

	if (query.sourceSystem) {
		where.sourceSystem = query.sourceSystem;
	}

	const [items, total] = await Promise.all([
		db.routing.findMany({
			where,
			select: {
				id: true,
				code: true,
				name: true,
				sourceSystem: true,
				productCode: true,
				version: true,
				isActive: true,
				effectiveFrom: true,
				effectiveTo: true,
				updatedAt: true,
				_count: { select: { steps: true } },
			},
			orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.routing.count({ where }),
	]);

	return {
		items: items.map((item) => ({
			id: item.id,
			code: item.code,
			name: item.name,
			sourceSystem: item.sourceSystem,
			productCode: item.productCode ?? null,
			version: item.version ?? null,
			isActive: item.isActive,
			effectiveFrom: item.effectiveFrom?.toISOString() ?? null,
			effectiveTo: item.effectiveTo?.toISOString() ?? null,
			updatedAt: item.updatedAt.toISOString(),
			stepCount: item._count.steps,
		})),
		total,
		page,
		pageSize,
	};
};

export const getRouteDetail = async (
	db: PrismaClient,
	routingCode: string,
): Promise<
	ServiceResult<{
		route: {
			id: string;
			code: string;
			name: string;
			sourceSystem: string;
			sourceKey: string | null;
			productCode: string | null;
			version: string | null;
			isActive: boolean;
			effectiveFrom: string | null;
			effectiveTo: string | null;
			createdAt: string;
			updatedAt: string;
		};
		steps: Array<{
			stepNo: number;
			sourceStepKey: string | null;
			operationCode: string;
			operationName: string;
			stationGroupCode: string | null;
			stationGroupName: string | null;
			stationType: string;
			requiresFAI: boolean;
			isLast: boolean;
		}>;
	}>
> => {
	const routing = await db.routing.findUnique({
		where: { code: routingCode },
		include: {
			steps: {
				orderBy: { stepNo: "asc" },
				include: {
					operation: true,
					stationGroup: true,
				},
			},
		},
	});

	if (!routing) {
		return { success: false, code: "ROUTE_NOT_FOUND", message: "Routing not found", status: 404 };
	}

	return {
		success: true,
		data: {
			route: {
				id: routing.id,
				code: routing.code,
				name: routing.name,
				sourceSystem: routing.sourceSystem,
				sourceKey: routing.sourceKey ?? null,
				productCode: routing.productCode ?? null,
				version: routing.version ?? null,
				isActive: routing.isActive,
				effectiveFrom: routing.effectiveFrom?.toISOString() ?? null,
				effectiveTo: routing.effectiveTo?.toISOString() ?? null,
				createdAt: routing.createdAt.toISOString(),
				updatedAt: routing.updatedAt.toISOString(),
			},
			steps: routing.steps.map((step) => ({
				stepNo: step.stepNo,
				sourceStepKey: step.sourceStepKey ?? null,
				operationCode: step.operation.code,
				operationName: step.operation.name,
				stationGroupCode: step.stationGroup?.code ?? null,
				stationGroupName: step.stationGroup?.name ?? null,
				stationType: step.stationType,
				requiresFAI: step.requiresFAI,
				isLast: step.isLast,
			})),
		},
	};
};
