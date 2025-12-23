import { type Prisma, type PrismaClient, RunStatus } from "@better-app/db";
import type { Static } from "elysia";
import { parseSortOrderBy } from "../../../utils/sort";
import type { runAuthorizeSchema, runListQuerySchema } from "./schema";

type RunAuthorizeInput = Static<typeof runAuthorizeSchema>;
type RunListQuery = Static<typeof runListQuerySchema>;

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

export const authorizeRun = async (db: PrismaClient, runNo: string, data: RunAuthorizeInput) => {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };

	if (data.action === "AUTHORIZE") {
		if (run.status === RunStatus.AUTHORIZED) {
			return { success: true, data: run };
		}
		if (run.status !== RunStatus.PREP && run.status !== RunStatus.FAI_PENDING) {
			return {
				success: false,
				code: "RUN_NOT_READY",
				message: "Run is not in a state that can be authorized",
			};
		}
		const updated = await db.run.update({
			where: { runNo },
			data: {
				status: RunStatus.AUTHORIZED,
			},
		});
		return { success: true, data: updated };
	} else {
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
	}
};
