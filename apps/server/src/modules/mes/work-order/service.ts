import { type Prisma, type PrismaClient, RunStatus, WorkOrderStatus } from "@better-app/db";
import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";
import type { Static } from "elysia";
import { parseSortOrderBy } from "../../../utils/sort";
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

const tracer = trace.getTracer("mes");

const setSpanAttributes = (span: Span, attributes: Record<string, unknown>) => {
	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			span.setAttribute(key, value);
		}
	}
};

export const listWorkOrders = async (db: PrismaClient, query: WorkOrderListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.WorkOrderWhereInput = {};

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean) as WorkOrderStatus[];
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.search) {
		where.OR = [{ woNo: { contains: query.search } }, { productCode: { contains: query.search } }];
	}

	const orderBy = parseSortOrderBy<Prisma.WorkOrderOrderByWithRelationInput>(query.sort, {
		allowedFields: ["woNo", "productCode", "status", "plannedQty", "dueDate", "createdAt"],
		fallback: [{ createdAt: "desc" }],
	});

	const [items, total] = await Promise.all([
		db.workOrder.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.workOrder.count({ where }),
	]);

	return { items, total, page, pageSize };
};

export const receiveWorkOrder = async (db: PrismaClient, data: WorkOrderReceiveInput) => {
	return await tracer.startActiveSpan("mes.work_orders.receive", async (span) => {
		setSpanAttributes(span, {
			"mes.work_order.wo_no": data.woNo,
			"mes.work_order.product_code": data.productCode,
			"mes.work_order.planned_qty": data.plannedQty,
			"mes.work_order.review_status": data.reviewStatus,
			"mes.work_order.routing_code": data.routingCode,
			"mes.source_system": data.sourceSystem,
		});

		try {
			const routing = data.routingCode
				? await db.routing.findUnique({ where: { code: data.routingCode } })
				: null;

			const result = await db.$transaction(async (tx) => {
				const wo = await tx.workOrder.upsert({
					where: { woNo: data.woNo },
					update: {
						productCode: data.productCode,
						plannedQty: data.plannedQty,
						routingId: routing?.id,
						reviewStatus: data.reviewStatus,
						dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
						meta: data.meta,
					},
					create: {
						woNo: data.woNo,
						productCode: data.productCode,
						plannedQty: data.plannedQty,
						routingId: routing?.id,
						reviewStatus: data.reviewStatus,
						dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
						meta: data.meta,
						status: WorkOrderStatus.RECEIVED,
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
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};

export const releaseWorkOrder = async (
	db: PrismaClient,
	woNo: string,
	data: WorkOrderReleaseInput,
) => {
	return await tracer.startActiveSpan("mes.work_orders.release", async (span) => {
		setSpanAttributes(span, {
			"mes.work_order.wo_no": woNo,
			"mes.release.line_code": data.lineCode,
			"mes.release.station_group_code": data.stationGroupCode,
		});

		try {
			const wo = await db.workOrder.findUnique({ where: { woNo } });
			if (!wo) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "WORK_ORDER_NOT_FOUND");
				return { success: false, code: "WORK_ORDER_NOT_FOUND", message: "Work order not found" };
			}

			if (wo.status !== WorkOrderStatus.RECEIVED) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "WORK_ORDER_NOT_RECEIVED");
				return {
					success: false,
					code: "WORK_ORDER_NOT_RECEIVED",
					message: "Work order already released or in progress",
				};
			}

			const updated = await db.workOrder.update({
				where: { woNo },
				data: {
					status: WorkOrderStatus.RELEASED,
				},
			});

			return { success: true, data: updated };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};

export const createRun = async (db: PrismaClient, woNo: string, data: RunCreateInput) => {
	return await tracer.startActiveSpan("mes.runs.create", async (span) => {
		setSpanAttributes(span, {
			"mes.work_order.wo_no": woNo,
			"mes.run.line_code": data.lineCode,
			"mes.run.shift_code": data.shiftCode,
			"mes.run.changeover_no": data.changeoverNo,
		});

		try {
			const wo = await db.workOrder.findUnique({ where: { woNo } });
			if (!wo) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "WORK_ORDER_NOT_FOUND");
				return { success: false, code: "WORK_ORDER_NOT_FOUND", message: "Work order not found" };
			}
			if (wo.status !== WorkOrderStatus.RELEASED && wo.status !== WorkOrderStatus.IN_PROGRESS) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "WORK_ORDER_NOT_RELEASED");
				return { success: false, code: "WORK_ORDER_NOT_RELEASED", message: "Work order not released" };
			}

			if (!wo.routingId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTE_NOT_FOUND");
				return { success: false, code: "ROUTE_NOT_FOUND", message: "Work order has no routing" };
			}

			const line = await db.line.findUnique({ where: { code: data.lineCode } });
			if (!line) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "LINE_NOT_FOUND");
				return { success: false, code: "LINE_NOT_FOUND", message: "Line not found" };
			}

			const latestVersion = await db.executableRouteVersion.findFirst({
				where: {
					routingId: wo.routingId,
					status: "READY",
				},
				orderBy: { versionNo: "desc" },
			});
			if (!latestVersion) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTE_VERSION_NOT_READY");
				return {
					success: false,
					code: "ROUTE_VERSION_NOT_READY",
					message: "No executable route version available",
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

			setSpanAttributes(span, { "mes.run.run_no": run.runNo });
			return { success: true, data: run };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};
