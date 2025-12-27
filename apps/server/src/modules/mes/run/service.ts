import { type Prisma, type PrismaClient, RunStatus } from "@better-app/db";
import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import { parseSortOrderBy } from "../../../utils/sort";
import type { runAuthorizeSchema, runListQuerySchema } from "./schema";

type RunAuthorizeInput = Static<typeof runAuthorizeSchema>;
type RunListQuery = Static<typeof runListQuerySchema>;
type RunRecord = Prisma.RunGetPayload<Prisma.RunDefaultArgs>;

const tracer = trace.getTracer("mes");

const setSpanAttributes = (span: Span, attributes: Record<string, unknown>) => {
	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			span.setAttribute(key, value);
		}
	}
};

export const listRuns = async (db: PrismaClient, query: RunListQuery) => {
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

	if (query.search) {
		where.OR = [
			{ runNo: { contains: query.search } },
			{ workOrder: { woNo: { contains: query.search } } },
		];
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
			include: { workOrder: true, line: true },
		}),
		db.run.count({ where }),
	]);

	return { items, total, page, pageSize };
};

export const authorizeRun = async (
	db: PrismaClient,
	runNo: string,
	data: RunAuthorizeInput,
): Promise<ServiceResult<RunRecord>> => {
	return await tracer.startActiveSpan(
		"mes.runs.authorize",
		async (span): Promise<ServiceResult<RunRecord>> => {
			setSpanAttributes(span, {
				"mes.run.run_no": runNo,
				"mes.run.action": data.action,
				"mes.run.reason": data.reason,
			});

			try {
				const run = await db.run.findUnique({ where: { runNo } });
				if (!run) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
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
					if (run.status !== RunStatus.PREP && run.status !== RunStatus.FAI_PENDING) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", "RUN_NOT_READY");
						return {
							success: false,
							code: "RUN_NOT_READY",
							message: "Run is not in a state that can be authorized",
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
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR });
				throw error;
			} finally {
				span.end();
			}
		},
	);
};
