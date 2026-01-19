import {
	InspectionType,
	type Prisma,
	type PrismaClient,
	RunStatus,
	UnitStatus,
} from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import { parseSortOrderBy } from "../../../utils/sort";
import { checkFaiGate } from "../fai/service";
import { checkAndTriggerOqc } from "../oqc/trigger-service";
import { canAuthorize as checkReadiness } from "../readiness/service";
import type {
	generateUnitsSchema,
	runAuthorizeSchema,
	runListQuerySchema,
	runUnitListQuerySchema,
} from "./schema";

type RunAuthorizeInput = Static<typeof runAuthorizeSchema>;
type RunListQuery = Static<typeof runListQuerySchema>;
type RunUnitListQuery = Static<typeof runUnitListQuerySchema>;
type GenerateUnitsInput = Static<typeof generateUnitsSchema>;
type RunRecord = Prisma.RunGetPayload<Prisma.RunDefaultArgs>;

const TERMINAL_RUN_STATUSES: RunStatus[] = [
	RunStatus.COMPLETED,
	RunStatus.CLOSED_REWORK,
	RunStatus.SCRAPPED,
];

const TERMINAL_UNIT_STATUSES: UnitStatus[] = [UnitStatus.DONE, UnitStatus.SCRAPPED];

type SnapshotStep = {
	stepNo: number;
	operationId: string;
	stationType: string;
	stationGroupId: string | null;
	allowedStationIds?: string[];
	requiresFAI?: boolean;
	requiresAuthorization?: boolean;
};

type StepMeta = {
	stepNo: number;
	operationCode: string;
	operationName: string | null;
	stationType: string;
	stationGroup: { code: string; name: string } | null;
	stationCodes: string[];
};

const getSnapshotSteps = (snapshot: Prisma.JsonValue | null | undefined): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];
	return record.steps.filter((step): step is SnapshotStep => !!step && typeof step === "object");
};

const isValidStationForStep = (
	step: SnapshotStep,
	station: { id: string; groupId: string | null; stationType: string },
) => {
	if (step.stationType !== station.stationType) {
		return false;
	}
	if (step.allowedStationIds && step.allowedStationIds.length > 0) {
		if (!step.allowedStationIds.includes(station.id)) return false;
	}
	if (step.stationGroupId && step.stationGroupId !== station.groupId) {
		return false;
	}
	return true;
};

const buildStepContext = async (db: PrismaClient, steps: SnapshotStep[], lineId: string | null) => {
	const sortedSteps = [...steps].sort((a, b) => a.stepNo - b.stepNo);
	const operationIds = [...new Set(sortedSteps.map((step) => step.operationId).filter(Boolean))];
	const stationGroupIds = [
		...new Set(sortedSteps.map((step) => step.stationGroupId).filter(Boolean)),
	] as string[];
	const allowedStationIds = [
		...new Set(
			sortedSteps.flatMap((step) =>
				step.allowedStationIds ? step.allowedStationIds.filter(Boolean) : [],
			),
		),
	];

	const [operations, stationGroups, stations] = await Promise.all([
		operationIds.length
			? db.operation.findMany({
					where: { id: { in: operationIds } },
					select: { id: true, code: true, name: true },
				})
			: Promise.resolve([]),
		stationGroupIds.length
			? db.stationGroup.findMany({
					where: { id: { in: stationGroupIds } },
					select: { id: true, code: true, name: true },
				})
			: Promise.resolve([]),
		stationGroupIds.length || allowedStationIds.length
			? db.station.findMany({
					where: {
						OR: [
							stationGroupIds.length ? { groupId: { in: stationGroupIds } } : undefined,
							allowedStationIds.length ? { id: { in: allowedStationIds } } : undefined,
						].filter(Boolean) as Prisma.StationWhereInput[],
					},
					select: { id: true, code: true, name: true, groupId: true, lineId: true },
				})
			: Promise.resolve([]),
	]);

	const operationById = new Map(operations.map((operation) => [operation.id, operation]));
	const stationGroupById = new Map(stationGroups.map((group) => [group.id, group]));
	const stationById = new Map(stations.map((station) => [station.id, station]));
	const stationsByGroupId = new Map<string, typeof stations>();

	for (const station of stations) {
		if (!station.groupId) continue;
		const list = stationsByGroupId.get(station.groupId) ?? [];
		list.push(station);
		stationsByGroupId.set(station.groupId, list);
	}

	const resolveStationCodes = (step: SnapshotStep) => {
		if (step.allowedStationIds && step.allowedStationIds.length > 0) {
			return step.allowedStationIds
				.map((id) => stationById.get(id))
				.filter(
					(station): station is NonNullable<typeof station> =>
						station !== undefined && station !== null && (!lineId || station.lineId === lineId),
				)
				.map((station) => station.code);
		}
		if (step.stationGroupId) {
			const candidates = stationsByGroupId.get(step.stationGroupId) ?? [];
			return candidates
				.filter((station) => (!lineId ? true : station.lineId === lineId))
				.map((station) => station.code);
		}
		return [];
	};

	const buildStepMeta = (step: SnapshotStep): StepMeta => {
		const operation = operationById.get(step.operationId);
		const stationGroup = step.stationGroupId ? stationGroupById.get(step.stationGroupId) : null;
		return {
			stepNo: step.stepNo,
			operationCode: operation?.code ?? step.operationId,
			operationName: operation?.name ?? null,
			stationType: step.stationType,
			stationGroup: stationGroup ? { code: stationGroup.code, name: stationGroup.name } : null,
			stationCodes: resolveStationCodes(step),
		};
	};

	const stepInfoByNo = new Map<number, StepMeta>();
	const nextStepInfoByNo = new Map<number, StepMeta | null>();

	for (let index = 0; index < sortedSteps.length; index += 1) {
		const step = sortedSteps[index];
		if (!step) continue;
		stepInfoByNo.set(step.stepNo, buildStepMeta(step));
		const nextStep = sortedSteps[index + 1];
		nextStepInfoByNo.set(step.stepNo, nextStep ? buildStepMeta(nextStep) : null);
	}

	return {
		steps: sortedSteps,
		stepInfoByNo,
		nextStepInfoByNo,
	};
};

export const getRunDetail = async (db: PrismaClient, runNo: string) => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: true,
			line: true,
			routeVersion: {
				include: {
					routing: true,
				},
			},
		},
	});

	if (!run) {
		return null;
	}

	const [unitStats, recentUnits] = await Promise.all([
		db.unit.groupBy({
			by: ["status"],
			where: { runId: run.id },
			_count: true,
		}),
		db.unit.findMany({
			where: { runId: run.id },
			orderBy: { updatedAt: "desc" },
			take: 20,
			select: {
				sn: true,
				status: true,
				currentStepNo: true,
				updatedAt: true,
			},
		}),
	]);

	const statsMap: Record<string, number> = {};
	let total = 0;
	for (const stat of unitStats) {
		statsMap[stat.status] = stat._count;
		total += stat._count;
	}

	const snapshotSteps = run.routeVersion ? getSnapshotSteps(run.routeVersion.snapshotJson) : [];
	let routeSteps: Array<StepMeta & { completed: number; total: number }> = [];
	if (snapshotSteps.length > 0) {
		const stepContext = await buildStepContext(db, snapshotSteps, run.lineId);
		const completedByStep = await db.track.groupBy({
			by: ["stepNo"],
			where: {
				unit: { runId: run.id },
				outAt: { not: null },
				result: "PASS",
			},
			_count: true,
		});
		const completedMap = new Map(completedByStep.map((stat) => [stat.stepNo, stat._count]));
		routeSteps = stepContext.steps.map((step) => ({
			...(stepContext.stepInfoByNo.get(step.stepNo) ?? {
				stepNo: step.stepNo,
				operationCode: step.operationId,
				operationName: null,
				stationType: step.stationType,
				stationGroup: null,
				stationCodes: [],
			}),
			completed: completedMap.get(step.stepNo) ?? 0,
			total,
		}));
	}

	let faiTrial: { status: string; sampleQty: number; trackedQty: number } | null = null;
	if (run.status === RunStatus.PREP) {
		const fai = await db.inspection.findFirst({
			where: { runId: run.id, type: InspectionType.FAI },
			orderBy: { createdAt: "desc" },
		});
		if (fai) {
			let trackedQty = 0;
			if (fai.startedAt) {
				const trackedUnits = await db.track.findMany({
					where: {
						unit: { runId: run.id },
						outAt: { not: null },
						createdAt: { gte: fai.startedAt },
					},
					distinct: ["unitId"],
					select: { unitId: true },
				});
				trackedQty = trackedUnits.length;
			}
			faiTrial = {
				status: fai.status,
				sampleQty: fai.sampleQty ?? 0,
				trackedQty,
			};
		}
	}

	return {
		run: {
			id: run.id,
			runNo: run.runNo,
			status: run.status,
			planQty: run.planQty,
			shiftCode: run.shiftCode,
			startedAt: run.startedAt?.toISOString() ?? null,
			endedAt: run.endedAt?.toISOString() ?? null,
			createdAt: run.createdAt.toISOString(),
		},
		workOrder: {
			woNo: run.workOrder.woNo,
			productCode: run.workOrder.productCode,
			plannedQty: run.workOrder.plannedQty,
		},
		line: run.line ? { code: run.line.code, name: run.line.name } : null,
		routeVersion: run.routeVersion
			? {
					versionNo: run.routeVersion.versionNo,
					status: run.routeVersion.status,
					route: {
						code: run.routeVersion.routing.code,
						name: run.routeVersion.routing.name,
					},
				}
			: null,
		routeSteps,
		unitStats: {
			total,
			queued: statsMap[UnitStatus.QUEUED] ?? 0,
			inStation: statsMap[UnitStatus.IN_STATION] ?? 0,
			done: statsMap[UnitStatus.DONE] ?? 0,
			failed:
				(statsMap[UnitStatus.OUT_FAILED] ?? 0) +
				(statsMap[UnitStatus.SCRAPPED] ?? 0) +
				(statsMap[UnitStatus.ON_HOLD] ?? 0),
		},
		faiTrial,
		recentUnits: recentUnits.map((u) => ({
			sn: u.sn,
			status: u.status,
			currentStepNo: u.currentStepNo,
			updatedAt: u.updatedAt.toISOString(),
		})),
	};
};

export const listRuns = async (
	db: PrismaClient,
	query: RunListQuery,
	extraWhere?: Prisma.RunWhereInput,
) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.RunWhereInput = {};

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean) as RunStatus[];
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.woNo) {
		where.workOrder = { woNo: query.woNo };
	}

	if (query.lineCode) {
		where.line = { code: query.lineCode };
	}

	if (query.search) {
		where.OR = [
			{ runNo: { contains: query.search } },
			{ workOrder: { woNo: { contains: query.search } } },
		];
	}

	if (extraWhere) {
		const andFilters: Prisma.RunWhereInput[] = [];
		if (where.AND) {
			if (Array.isArray(where.AND)) {
				andFilters.push(...where.AND);
			} else {
				andFilters.push(where.AND);
			}
		}
		andFilters.push(extraWhere);
		where.AND = andFilters;
	}

	const orderBy = parseSortOrderBy<Prisma.RunOrderByWithRelationInput>(query.sort, {
		allowedFields: ["runNo", "status", "createdAt", "workOrder.woNo"],
		fallback: [{ createdAt: "desc" }],
	});

	const [items, total] = await Promise.all([
		db.run.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				workOrder: true,
				line: true,
				readinessChecks: {
					orderBy: { checkedAt: "desc" },
					take: 1,
					select: { status: true },
				},
			},
		}),
		db.run.count({ where }),
	]);

	const itemsWithReadiness = items.map(({ readinessChecks, ...run }) => ({
		...run,
		readinessStatus: readinessChecks[0]?.status ?? null,
	}));

	return { items: itemsWithReadiness, total, page, pageSize };
};

export const listRunUnits = async (
	db: PrismaClient,
	runNo: string,
	query: RunUnitListQuery,
): Promise<
	ServiceResult<{
		run: { runNo: string; status: string };
		workOrder: { woNo: string; productCode: string };
		items: Array<{
			sn: string;
			status: string;
			currentStepNo: number;
			updatedAt: string;
			currentStep: StepMeta | null;
			nextStep: StepMeta | null;
		}>;
		total: number;
		page: number;
		pageSize: number;
	}>
> => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: true,
			routeVersion: true,
			line: true,
		},
	});

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	if (!run.routeVersion) {
		return {
			success: false as const,
			code: "ROUTE_VERSION_NOT_READY",
			message: "Run has no executable route version",
			status: 400,
		};
	}

	const snapshotSteps = getSnapshotSteps(run.routeVersion.snapshotJson);
	if (snapshotSteps.length === 0) {
		return {
			success: false as const,
			code: "ROUTING_EMPTY",
			message: "Route snapshot has no steps",
			status: 400,
		};
	}

	const stepContext = await buildStepContext(db, snapshotSteps, run.lineId);
	const firstStepNo = stepContext.steps[0]?.stepNo ?? 0;

	let validStepNos: number[] | null = null;
	if (query.stationCode) {
		const station = await db.station.findUnique({
			where: { code: query.stationCode },
			select: { id: true, groupId: true, stationType: true },
		});
		if (!station) {
			return {
				success: false as const,
				code: "STATION_NOT_FOUND",
				message: "Station not found",
				status: 404,
			};
		}
		validStepNos = stepContext.steps
			.filter((step) => isValidStationForStep(step, station))
			.map((step) => step.stepNo);
	}

	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 50, 200);
	const where: Prisma.UnitWhereInput = { runId: run.id };

	if (query.status) {
		const statuses = query.status
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		if (statuses.length > 0) {
			where.status = { in: statuses as UnitStatus[] };
		}
	}

	if (validStepNos) {
		const stepFilters: Prisma.UnitWhereInput[] = [];
		if (validStepNos.length > 0) {
			stepFilters.push({ currentStepNo: { in: validStepNos } });
		}
		if (stepFilters.length === 0) {
			return {
				success: true as const,
				data: {
					run: { runNo: run.runNo, status: run.status },
					workOrder: { woNo: run.workOrder.woNo, productCode: run.workOrder.productCode },
					items: [],
					total: 0,
					page,
					pageSize,
				},
			};
		}
		where.OR = stepFilters;
	}

	const [units, total] = await Promise.all([
		db.unit.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				sn: true,
				status: true,
				currentStepNo: true,
				updatedAt: true,
			},
		}),
		db.unit.count({ where }),
	]);

	const items = units.map((unit) => {
		const currentStepNo = unit.currentStepNo ?? firstStepNo;
		const currentStep = currentStepNo
			? (stepContext.stepInfoByNo.get(currentStepNo) ?? null)
			: null;
		const nextStep =
			currentStepNo && stepContext.nextStepInfoByNo.has(currentStepNo)
				? (stepContext.nextStepInfoByNo.get(currentStepNo) ?? null)
				: null;
		return {
			sn: unit.sn,
			status: unit.status,
			currentStepNo: currentStepNo ?? 0,
			updatedAt: unit.updatedAt.toISOString(),
			currentStep,
			nextStep,
		};
	});

	return {
		success: true as const,
		data: {
			run: { runNo: run.runNo, status: run.status },
			workOrder: { woNo: run.workOrder.woNo, productCode: run.workOrder.productCode },
			items,
			total,
			page,
			pageSize,
		},
	};
};

export const authorizeRun = async (
	db: PrismaClient,
	runNo: string,
	data: RunAuthorizeInput,
): Promise<ServiceResult<RunRecord>> => {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	if (data.action === "AUTHORIZE") {
		if (run.status === RunStatus.AUTHORIZED) {
			return { success: true, data: run };
		}
		if (run.status !== RunStatus.PREP) {
			return {
				success: false,
				code: "RUN_NOT_READY",
				message: "Run is not in a state that can be authorized",
				status: 400,
			};
		}

		const readinessResult = await checkReadiness(db, runNo);
		if (!readinessResult.success) {
			return readinessResult as ServiceResult<RunRecord>;
		}
		if (!readinessResult.data.canAuthorize) {
			return {
				success: false,
				code: "READINESS_CHECK_FAILED",
				message: "Readiness check failed. All items must pass or be waived before authorization.",
				status: 400,
			};
		}

		// Check FAI gate if required
		const faiResult = await checkFaiGate(db, runNo);
		if (!faiResult.success) {
			return faiResult as ServiceResult<RunRecord>;
		}
		if (faiResult.data.requiresFai && !faiResult.data.faiPassed) {
			return {
				success: false,
				code: "FAI_NOT_PASSED",
				message: "FAI inspection is required but not passed. Complete FAI before authorization.",
				status: 400,
			};
		}

		const updated = await db.run.update({
			where: { runNo },
			data: {
				status: RunStatus.AUTHORIZED,
			},
		});
		return { success: true, data: updated };
	}

	if (run.status !== RunStatus.AUTHORIZED) {
		return { success: true, data: run };
	}
	const updated = await db.run.update({
		where: { runNo },
		data: {
			status: RunStatus.PREP,
		},
	});
	return { success: true, data: updated };
};

export const closeRun = async (
	db: PrismaClient,
	runNo: string,
	options?: { closedBy?: string },
): Promise<ServiceResult<RunRecord>> => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: { units: { select: { status: true } } },
	});

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const { units: _units, ...runRecord } = run;

	if (TERMINAL_RUN_STATUSES.includes(run.status)) {
		return { success: true as const, data: runRecord };
	}

	if (run.status !== RunStatus.IN_PROGRESS) {
		return {
			success: false as const,
			code: "RUN_NOT_CLOSABLE",
			message: `Run status ${run.status} does not allow closeout`,
			status: 400,
		};
	}

	if (run.units.length === 0) {
		return {
			success: false as const,
			code: "RUN_HAS_NO_UNITS",
			message: "Run has no units",
			status: 400,
		};
	}

	const allUnitsTerminal = run.units.every((unit) => TERMINAL_UNIT_STATUSES.includes(unit.status));
	if (!allUnitsTerminal) {
		return {
			success: false as const,
			code: "RUN_UNITS_NOT_TERMINAL",
			message: "Not all units are terminal (DONE/SCRAPPED)",
			status: 400,
		};
	}

	const oqcTriggerResult = await checkAndTriggerOqc(db, runNo, {
		createdBy: options?.closedBy,
	});
	if (!oqcTriggerResult.success) {
		return oqcTriggerResult as ServiceResult<RunRecord>;
	}

	if (oqcTriggerResult.data.triggered) {
		return {
			success: false as const,
			code: "OQC_REQUIRED",
			message: `OQC is required. Task ${oqcTriggerResult.data.oqcId} created.`,
			status: 409,
		};
	}

	if (!oqcTriggerResult.data.completed) {
		return {
			success: false as const,
			code: "RUN_CLOSEOUT_FAILED",
			message: oqcTriggerResult.data.reason,
			status: 400,
		};
	}

	const updatedRun = await db.run.findUnique({ where: { runNo } });
	if (!updatedRun) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	return { success: true as const, data: updatedRun };
};

/**
 * Archive a completed Run to history storage.
 * TODO: Implement when archive functionality is needed:
 * - Move Run and related Units to archive tables
 * - Preserve traceability data
 * - Clean up from active tables
 * - Consider retention policies
 */
export const archiveRun = async (
	_db: PrismaClient,
	_runNo: string,
): Promise<ServiceResult<{ archived: boolean }>> => {
	// Placeholder - not yet implemented
	return {
		success: false as const,
		code: "NOT_IMPLEMENTED",
		message: "Run archiving is not yet implemented",
		status: 501,
	};
};

/**
 * Generate units for a Run.
 * Creates unit records with auto-generated SNs based on the run number.
 */
export const generateUnits = async (
	db: PrismaClient,
	runNo: string,
	data: GenerateUnitsInput,
): Promise<ServiceResult<{ generated: number; units: Array<{ sn: string; status: string }> }>> => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: true,
			routeVersion: {
				include: {
					routing: {
						include: {
							steps: { orderBy: { stepNo: "asc" }, take: 1 },
						},
					},
				},
			},
		},
	});

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	// Check if run is in a valid state for unit generation
	const allowedStatuses: RunStatus[] = [RunStatus.PREP, RunStatus.AUTHORIZED];
	if (!allowedStatuses.includes(run.status)) {
		return {
			success: false as const,
			code: "INVALID_RUN_STATUS",
			message: `Cannot generate units for run in status ${run.status}. Allowed: ${allowedStatuses.join(", ")}`,
			status: 400,
		};
	}

	// Check existing unit count
	const existingCount = await db.unit.count({ where: { runId: run.id } });
	if (existingCount > 0) {
		return {
			success: false as const,
			code: "UNITS_ALREADY_EXIST",
			message: `Run already has ${existingCount} units. Delete existing units first or use a different run.`,
			status: 400,
		};
	}

	// Check quantity does not exceed planQty
	if (data.quantity > run.planQty) {
		return {
			success: false as const,
			code: "QUANTITY_EXCEEDS_PLAN",
			message: `Requested quantity (${data.quantity}) exceeds run plan quantity (${run.planQty})`,
			status: 400,
		};
	}

	// Generate SN prefix based on run number or custom prefix
	const snPrefix = data.snPrefix || `SN-${runNo}-`;

	// Get first step number from routing
	const firstStepNo = run.routeVersion?.routing?.steps?.[0]?.stepNo ?? 1;

	// Create units in batch
	const unitsData = Array.from({ length: data.quantity }, (_, i) => ({
		runId: run.id,
		woId: run.workOrder.id,
		sn: `${snPrefix}${String(i + 1).padStart(4, "0")}`,
		status: UnitStatus.QUEUED,
		currentStepNo: firstStepNo,
	}));

	await db.unit.createMany({ data: unitsData });

	// Fetch created units for response
	const createdUnits = await db.unit.findMany({
		where: { runId: run.id },
		select: { sn: true, status: true },
		orderBy: { sn: "asc" },
	});

	return {
		success: true as const,
		data: {
			generated: createdUnits.length,
			units: createdUnits,
		},
	};
};

/**
 * Delete all QUEUED units for a Run (only if they have no Track records).
 */
export const deleteUnits = async (
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ deleted: number }>> => {
	const run = await db.run.findUnique({ where: { runNo } });

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	// Only allow deletion for non-terminal runs
	if (TERMINAL_RUN_STATUSES.includes(run.status)) {
		return {
			success: false as const,
			code: "RUN_IN_TERMINAL_STATUS",
			message: `Cannot delete units for run in terminal status ${run.status}`,
			status: 400,
		};
	}

	// Find all units for this run
	const units = await db.unit.findMany({
		where: { runId: run.id },
		select: { id: true, sn: true, status: true },
	});

	if (units.length === 0) {
		return {
			success: true as const,
			data: { deleted: 0 },
		};
	}

	// Check if any unit has track records (has been processed)
	const unitsWithTracks = await db.track.findMany({
		where: { unitId: { in: units.map((u) => u.id) } },
		select: { unitId: true },
	});
	const trackedUnitIds = new Set(unitsWithTracks.map((t) => t.unitId));

	// Only allow deletion of QUEUED units without track records
	const deletableUnits = units.filter(
		(u) => u.status === UnitStatus.QUEUED && !trackedUnitIds.has(u.id),
	);
	const nonDeletableUnits = units.filter(
		(u) => u.status !== UnitStatus.QUEUED || trackedUnitIds.has(u.id),
	);

	if (nonDeletableUnits.length > 0) {
		return {
			success: false as const,
			code: "UNITS_CANNOT_BE_DELETED",
			message: `${nonDeletableUnits.length} unit(s) cannot be deleted because they have been processed or are not in QUEUED status`,
			status: 400,
		};
	}

	// Delete all deletable units
	await db.unit.deleteMany({
		where: { id: { in: deletableUnits.map((u) => u.id) } },
	});

	return {
		success: true as const,
		data: { deleted: deletableUnits.length },
	};
};
