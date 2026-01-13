import { type Prisma, type PrismaClient, RunStatus, WorkOrderStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import { parseSortOrderBy } from "../../../utils/sort";
import { performCheck } from "../readiness/service";
import type {
	runCreateSchema,
	workOrderListQuerySchema,
	workOrderReceiveSchema,
	workOrderReleaseSchema,
} from "./schema";

type WorkOrderReceiveInput = Static<typeof workOrderReceiveSchema>;
type WorkOrderReleaseInput = Static<typeof workOrderReleaseSchema>;
type RunCreateInput = Static<typeof runCreateSchema>;
type WorkOrderListQuery = Static<typeof workOrderListQuerySchema>;

const TERMINAL_RUN_STATUSES: RunStatus[] = [
	RunStatus.COMPLETED,
	RunStatus.CLOSED_REWORK,
	RunStatus.SCRAPPED,
];

const isWorkOrderStatus = (value: string | undefined): value is WorkOrderStatus =>
	Boolean(value) && Object.values(WorkOrderStatus).includes(value as WorkOrderStatus);

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const listWorkOrders = async (
	db: PrismaClient,
	query: WorkOrderListQuery,
	extraWhere?: Prisma.WorkOrderWhereInput,
) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.WorkOrderWhereInput = {};
	const andFilters: Prisma.WorkOrderWhereInput[] = [];

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean) as WorkOrderStatus[];
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.erpPickStatus) {
		const pickStatuses = query.erpPickStatus.split(",").filter(Boolean);
		if (pickStatuses.length > 0) {
			andFilters.push({
				OR: [
					{ erpPickStatus: { in: pickStatuses } },
					{
						AND: [
							{ OR: [{ erpStatus: null }, { erpStatus: "" }] },
							{ pickStatus: { in: pickStatuses } },
						],
					},
				],
			});
		}
	}

	if (query.routingId) {
		const routingIds = query.routingId.split(",").filter(Boolean);
		if (routingIds.length > 0) {
			where.routingId = { in: routingIds };
		}
	}

	if (query.search) {
		where.OR = [{ woNo: { contains: query.search } }, { productCode: { contains: query.search } }];
	}

	if (extraWhere) {
		andFilters.push(extraWhere);
	}

	if (andFilters.length > 0) {
		if (where.AND) {
			where.AND = Array.isArray(where.AND)
				? [...where.AND, ...andFilters]
				: [where.AND, ...andFilters];
		} else {
			where.AND = andFilters;
		}
	}

	const orderBy = parseSortOrderBy<Prisma.WorkOrderOrderByWithRelationInput>(query.sort, {
		allowedFields: [
			"woNo",
			"productCode",
			"status",
			"plannedQty",
			"dueDate",
			"createdAt",
			"erpStatus",
			"erpPickStatus",
		],
		fallback: [{ createdAt: "desc" }],
	});

	const [items, total] = await Promise.all([
		db.workOrder.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				routing: {
					select: {
						id: true,
						code: true,
						name: true,
					},
				},
			},
		}),
		db.workOrder.count({ where }),
	]);

	return { items, total, page, pageSize };
};

export const receiveWorkOrder = async (db: PrismaClient, data: WorkOrderReceiveInput) => {
	const routing = data.routingCode
		? await db.routing.findUnique({ where: { code: data.routingCode } })
		: null;
	const status = isWorkOrderStatus(data.status) ? data.status : WorkOrderStatus.RECEIVED;

	const result = await db.$transaction(async (tx) => {
		const wo = await tx.workOrder.upsert({
			where: { woNo: data.woNo },
			update: {
				productCode: data.productCode,
				plannedQty: data.plannedQty,
				routingId: routing?.id,
				pickStatus: data.pickStatus,
				dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
				erpStatus: data.erpStatus,
				erpPickStatus: data.erpPickStatus,
				meta: data.meta,
			},
			create: {
				woNo: data.woNo,
				productCode: data.productCode,
				plannedQty: data.plannedQty,
				routingId: routing?.id,
				pickStatus: data.pickStatus,
				dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
				erpStatus: data.erpStatus,
				erpPickStatus: data.erpPickStatus,
				meta: data.meta,
				status,
			},
		});

		await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: data.sourceSystem ?? "ERP",
				businessKey: data.woNo,
				status: "SUCCESS",
				payload: data,
			},
		});

		return wo;
	});

	return result;
};

export const releaseWorkOrder = async (
	db: PrismaClient,
	woNo: string,
	data: WorkOrderReleaseInput,
): Promise<ServiceResult<Prisma.WorkOrderGetPayload<Prisma.WorkOrderDefaultArgs>>> => {
	const wo = await db.workOrder.findUnique({ where: { woNo } });
	if (!wo) {
		return {
			success: false,
			code: "WORK_ORDER_NOT_FOUND",
			message: "Work order not found",
			status: 404,
		};
	}

	if (wo.status !== WorkOrderStatus.RECEIVED) {
		return {
			success: false,
			code: "WORK_ORDER_NOT_RECEIVED",
			message: "Work order already released or in progress",
			status: 400,
		};
	}

	// 检查路由是否存在
	if (!wo.routingId) {
		return {
			success: false,
			code: "ROUTE_NOT_FOUND",
			message: "工单未关联路由",
			status: 400,
		};
	}

	// 检查路由是否有 READY 版本
	const readyVersion = await db.executableRouteVersion.findFirst({
		where: { routingId: wo.routingId, status: "READY" },
	});
	if (!readyVersion) {
		return {
			success: false,
			code: "ROUTE_NOT_READY",
			message: "路由尚未编译或无可用版本",
			status: 400,
		};
	}

	const line = await db.line.findUnique({ where: { code: data.lineCode } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}

	const stationGroup = data.stationGroupCode
		? await db.stationGroup.findUnique({ where: { code: data.stationGroupCode } })
		: null;
	if (data.stationGroupCode && !stationGroup) {
		return {
			success: false,
			code: "STATION_GROUP_NOT_FOUND",
			message: "Station group not found",
			status: 404,
		};
	}

	const baseMeta = isJsonObject(wo.meta) ? wo.meta : {};
	const existingDispatch = isJsonObject(baseMeta.dispatch) ? baseMeta.dispatch : {};
	const updated = await db.workOrder.update({
		where: { woNo },
		data: {
			status: WorkOrderStatus.RELEASED,
			meta: {
				...baseMeta,
				dispatch: {
					...existingDispatch,
					lineId: line.id,
					lineCode: line.code,
					stationGroupId: stationGroup?.id ?? null,
					stationGroupCode: stationGroup?.code ?? null,
					dispatchedAt: new Date().toISOString(),
				},
			},
		},
	});

	return { success: true, data: updated };
};

export const createRun = async (
	db: PrismaClient,
	woNo: string,
	data: RunCreateInput,
): Promise<ServiceResult<Prisma.RunGetPayload<Prisma.RunDefaultArgs>>> => {
	const wo = await db.workOrder.findUnique({ where: { woNo } });
	if (!wo) {
		return {
			success: false,
			code: "WORK_ORDER_NOT_FOUND",
			message: "Work order not found",
			status: 404,
		};
	}
	if (wo.status !== WorkOrderStatus.RELEASED && wo.status !== WorkOrderStatus.IN_PROGRESS) {
		return {
			success: false,
			code: "WORK_ORDER_NOT_RELEASED",
			message: "Work order not released",
			status: 400,
		};
	}

	// 判断物料是否就绪：ERP 工单使用 erpPickStatus，手动工单使用 pickStatus
	const isMaterialReady = wo.erpStatus
		? ["2", "3", "4"].includes(wo.erpPickStatus ?? "")
		: ["2", "3", "4"].includes(wo.pickStatus ?? "");
	if (!isMaterialReady) {
		return {
			success: false,
			code: "WORK_ORDER_MATERIAL_NOT_READY",
			message: "Work order material not ready",
			status: 400,
		};
	}

	if (!wo.routingId) {
		return {
			success: false,
			code: "ROUTE_NOT_FOUND",
			message: "Work order has no routing",
			status: 404,
		};
	}

	const line = await db.line.findUnique({ where: { code: data.lineCode } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}

	const dispatchMeta =
		isJsonObject(wo.meta) && isJsonObject(wo.meta.dispatch) ? wo.meta.dispatch : null;
	const dispatchedLineCode =
		dispatchMeta && typeof dispatchMeta.lineCode === "string" ? dispatchMeta.lineCode : null;
	if (dispatchedLineCode && dispatchedLineCode !== data.lineCode) {
		return {
			success: false,
			code: "WORK_ORDER_DISPATCH_LINE_MISMATCH",
			message: `Work order dispatched to line ${dispatchedLineCode}`,
			status: 400,
		};
	}

	const latestVersion = await db.executableRouteVersion.findFirst({
		where: {
			routingId: wo.routingId,
			status: "READY",
		},
		orderBy: { versionNo: "desc" },
	});
	if (!latestVersion) {
		return {
			success: false,
			code: "ROUTE_VERSION_NOT_READY",
			message: "No executable route version available",
			status: 404,
		};
	}

	const snapshot = latestVersion.snapshotJson;
	const steps = (() => {
		if (!snapshot || typeof snapshot !== "object") return [];
		const record = snapshot as { steps?: unknown };
		if (!Array.isArray(record.steps)) return [];
		return record.steps
			.map((step) => {
				if (!step || typeof step !== "object") return null;
				const value = step as {
					stepNo?: unknown;
					stationType?: unknown;
					stationGroupId?: unknown;
					allowedStationIds?: unknown;
				};
				const stepNo = typeof value.stepNo === "number" ? value.stepNo : null;
				const stationType = typeof value.stationType === "string" ? value.stationType : null;
				const stationGroupId =
					typeof value.stationGroupId === "string" ? value.stationGroupId : null;
				const allowedStationIds = Array.isArray(value.allowedStationIds)
					? value.allowedStationIds.filter((id): id is string => typeof id === "string")
					: [];
				if (!stepNo || !stationType) return null;
				return { stepNo, stationType, stationGroupId, allowedStationIds };
			})
			.filter((step): step is NonNullable<typeof step> => Boolean(step))
			.sort((a, b) => a.stepNo - b.stepNo);
	})();

	const lineStations = await db.station.findMany({
		where: { lineId: line.id },
		select: { id: true, stationType: true, groupId: true },
	});

	const isStationValidForStep = (
		step: {
			stationType: string;
			stationGroupId: string | null;
			allowedStationIds: string[];
		},
		station: { id: string; stationType: string; groupId: string | null },
	) => {
		if (step.stationType !== station.stationType) return false;
		if (step.allowedStationIds.length > 0 && !step.allowedStationIds.includes(station.id))
			return false;
		if (step.stationGroupId && step.stationGroupId !== station.groupId) return false;
		return true;
	};

	const incompatibleSteps = steps.filter(
		(step) => !lineStations.some((station) => isStationValidForStep(step, station)),
	);
	if (incompatibleSteps.length > 0) {
		const missingGroupIds = [
			...new Set(
				incompatibleSteps
					.map((s) => s.stationGroupId)
					.filter((id): id is string => typeof id === "string" && id.length > 0),
			),
		];
		const groupById = new Map(
			(missingGroupIds.length
				? await db.stationGroup.findMany({
						where: { id: { in: missingGroupIds } },
						select: { id: true, code: true },
					})
				: []
			).map((g) => [g.id, g.code]),
		);
		const groupLabels = missingGroupIds
			.map((id) => groupById.get(id) ?? id)
			.filter(Boolean)
			.join(", ");
		const stepNos = incompatibleSteps.map((s) => s.stepNo).join(", ");

		return {
			success: false,
			code: "RUN_LINE_INCOMPATIBLE_WITH_ROUTE",
			message:
				groupLabels.length > 0
					? `Line ${line.code} is incompatible with route steps (missing station group(s): ${groupLabels}; stepNo: ${stepNos})`
					: `Line ${line.code} is incompatible with route steps (stepNo: ${stepNos})`,
			status: 400,
		};
	}

	// Generate a simple run number if not provided
	const runNo = `RUN-${woNo}-${Date.now()}`;

	const run = await db.$transaction(async (tx) => {
		const created = await tx.run.create({
			data: {
				runNo,
				woId: wo.id,
				lineId: line.id,
				routeVersionId: latestVersion.id,
				planQty: data.planQty,
				shiftCode: data.shiftCode,
				changeoverNo: data.changeoverNo,
				status: RunStatus.PREP,
			},
		});

		if (wo.status !== WorkOrderStatus.IN_PROGRESS) {
			await tx.workOrder.update({
				where: { woNo },
				data: { status: WorkOrderStatus.IN_PROGRESS },
			});
		}

		return created;
	});

	// Trigger automatic precheck after run creation (async, non-blocking)
	performCheck(db, run.runNo, "PRECHECK").catch((err) => {
		console.error(`[Run ${run.runNo}] Auto precheck failed:`, err);
	});

	return { success: true, data: run };
};

export const updatePickStatus = async (
	db: PrismaClient,
	woNo: string,
	pickStatus: string,
): Promise<ServiceResult<Prisma.WorkOrderGetPayload<Prisma.WorkOrderDefaultArgs>>> => {
	const wo = await db.workOrder.findUnique({ where: { woNo } });
	if (!wo) {
		return {
			success: false,
			code: "WORK_ORDER_NOT_FOUND",
			message: "工单不存在",
			status: 404,
		};
	}

	// 只有手动工单（erpStatus 为空）才能修改
	if (wo.erpStatus) {
		return {
			success: false,
			code: "ERP_WORK_ORDER_NOT_EDITABLE",
			message: "ERP 工单不允许手动修改物料状态",
			status: 400,
		};
	}

	const updated = await db.workOrder.update({
		where: { woNo },
		data: { pickStatus },
	});
	return { success: true, data: updated };
};

export const closeWorkOrder = async (
	db: PrismaClient,
	woNo: string,
): Promise<ServiceResult<Prisma.WorkOrderGetPayload<Prisma.WorkOrderDefaultArgs>>> => {
	const wo = await db.workOrder.findUnique({
		where: { woNo },
		include: { runs: { select: { runNo: true, status: true } } },
	});

	if (!wo) {
		return {
			success: false as const,
			code: "WORK_ORDER_NOT_FOUND",
			message: "Work order not found",
			status: 404,
		};
	}

	const { runs: _runs, ...workOrderRecord } = wo;

	if (wo.status === WorkOrderStatus.COMPLETED) {
		return { success: true as const, data: workOrderRecord };
	}

	if (wo.runs.length === 0) {
		return {
			success: false as const,
			code: "WORK_ORDER_HAS_NO_RUNS",
			message: "Work order has no runs",
			status: 400,
		};
	}

	const nonTerminalRuns = wo.runs.filter((run) => !TERMINAL_RUN_STATUSES.includes(run.status));
	if (nonTerminalRuns.length > 0) {
		return {
			success: false as const,
			code: "WORK_ORDER_RUNS_NOT_TERMINAL",
			message: `Work order has non-terminal runs: ${nonTerminalRuns
				.map((run) => `${run.runNo}(${run.status})`)
				.join(", ")}`,
			status: 409,
		};
	}

	const updated = await db.workOrder.update({
		where: { woNo },
		data: { status: WorkOrderStatus.COMPLETED },
	});

	return { success: true as const, data: updated };
};

/**
 * Archive a completed WorkOrder to history storage.
 * TODO: Implement when archive functionality is needed:
 * - Move WorkOrder and all related Runs/Units to archive tables
 * - Preserve traceability and audit data
 * - Clean up from active tables
 * - Consider retention policies and compliance requirements
 */
export const archiveWorkOrder = async (
	_db: PrismaClient,
	_woNo: string,
): Promise<ServiceResult<{ archived: boolean }>> => {
	// Placeholder - not yet implemented
	return {
		success: false as const,
		code: "NOT_IMPLEMENTED",
		message: "WorkOrder archiving is not yet implemented",
		status: 501,
	};
};
