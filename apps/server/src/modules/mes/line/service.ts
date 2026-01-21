import type { Prisma, PrismaClient, ProcessType } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { lineCreateSchema, lineListQuerySchema, lineUpdateSchema } from "./schema";

type LineCreateInput = Static<typeof lineCreateSchema>;
type LineUpdateInput = Static<typeof lineUpdateSchema>;
type LineListQuery = Static<typeof lineListQuerySchema>;

export type LineDetail = {
	id: string;
	code: string;
	name: string;
	processType: ProcessType;
	createdAt: string;
	updatedAt: string;
};

export type LineSummary = {
	id: string;
	code: string;
	name: string;
	processType: ProcessType;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();
const normalizeName = (name: string) => name.trim();

const toDetail = (line: {
	id: string;
	code: string;
	name: string;
	processType: ProcessType;
	createdAt: Date;
	updatedAt: Date;
}): LineDetail => ({
	id: line.id,
	code: line.code,
	name: line.name,
	processType: line.processType,
	createdAt: line.createdAt.toISOString(),
	updatedAt: line.updatedAt.toISOString(),
});

const toSummary = (line: {
	id: string;
	code: string;
	name: string;
	processType: ProcessType;
}): LineSummary => ({
	id: line.id,
	code: line.code,
	name: line.name,
	processType: line.processType,
});

const buildOrderBy = (
	sort: LineListQuery["sort"] | undefined,
): Prisma.LineOrderByWithRelationInput[] => {
	if (!sort) return [{ code: "asc" }, { id: "asc" }];
	const parts = sort
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const orderBy: Prisma.LineOrderByWithRelationInput[] = [];
	for (const part of parts) {
		const [field, directionRaw] = part.split(".");
		const direction = directionRaw === "desc" ? "desc" : "asc";
		switch (field) {
			case "code":
			case "name":
			case "processType":
			case "createdAt":
			case "updatedAt":
				orderBy.push({ [field]: direction } as Prisma.LineOrderByWithRelationInput);
				break;
			default:
				break;
		}
	}
	if (orderBy.length === 0) return [{ code: "asc" }, { id: "asc" }];
	orderBy.push({ id: "asc" });
	return orderBy;
};

const buildLineDependencyCounts = async (db: Prisma.TransactionClient, lineId: string) => {
	const [
		stationCount,
		runCount,
		bindingCount,
		slotCount,
		lineStencilCount,
		lineSolderPasteCount,
		usageRecordCount,
		qcRuleCount,
	] = await Promise.all([
		db.station.count({ where: { lineId } }),
		db.run.count({ where: { lineId } }),
		db.userLineBinding.count({ where: { lineId } }),
		db.feederSlot.count({ where: { lineId } }),
		db.lineStencil.count({ where: { lineId } }),
		db.lineSolderPaste.count({ where: { lineId } }),
		db.solderPasteUsageRecord.count({ where: { lineId } }),
		db.oqcSamplingRule.count({ where: { lineId } }),
	]);

	return {
		stationCount,
		runCount,
		bindingCount,
		slotCount,
		lineStencilCount,
		lineSolderPasteCount,
		usageRecordCount,
		qcRuleCount,
	};
};

const hasLineDependencies = (counts: Awaited<ReturnType<typeof buildLineDependencyCounts>>) => {
	return (
		counts.stationCount > 0 ||
		counts.runCount > 0 ||
		counts.bindingCount > 0 ||
		counts.slotCount > 0 ||
		counts.lineStencilCount > 0 ||
		counts.lineSolderPasteCount > 0 ||
		counts.usageRecordCount > 0 ||
		counts.qcRuleCount > 0
	);
};

export const listLines = async (db: PrismaClient, query: LineListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.LineWhereInput = {};
	if (query.search) {
		where.OR = [{ code: { contains: query.search } }, { name: { contains: query.search } }];
	}
	if (query.processType) {
		where.processType = query.processType;
	}
	const orderBy = buildOrderBy(query.sort);
	const [rows, total] = await db.$transaction([
		db.line.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: { id: true, code: true, name: true, processType: true },
		}),
		db.line.count({ where }),
	]);
	return {
		items: rows.map(toSummary),
		total,
		page,
		pageSize,
	};
};

export const getLine = async (
	db: PrismaClient,
	lineId: string,
): Promise<ServiceResult<LineDetail>> => {
	const line = await db.line.findUnique({ where: { id: lineId } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}
	return { success: true, data: toDetail(line) };
};

export const createLine = async (
	db: PrismaClient,
	input: LineCreateInput,
): Promise<ServiceResult<LineDetail>> => {
	const code = normalizeCode(input.code);
	const name = normalizeName(input.name);

	if (!code) {
		return { success: false, code: "CODE_REQUIRED", message: "Code is required", status: 400 };
	}
	if (!name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.line.findUnique({ where: { code } });
		if (existing) {
			return {
				success: false,
				code: "LINE_CODE_DUPLICATE",
				message: "Line code already exists",
				status: 409,
			};
		}

		const line = await tx.line.create({
			data: {
				code,
				name,
				processType: input.processType,
			},
		});

		return { success: true, data: toDetail(line) };
	});
};

export const updateLine = async (
	db: PrismaClient,
	lineId: string,
	input: LineUpdateInput,
): Promise<ServiceResult<LineDetail>> => {
	const code = input.code === undefined ? undefined : normalizeCode(input.code);
	const name = input.name === undefined ? undefined : normalizeName(input.name);

	if (code !== undefined && !code) {
		return { success: false, code: "CODE_REQUIRED", message: "Code is required", status: 400 };
	}
	if (name !== undefined && !name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.line.findUnique({ where: { id: lineId } });
		if (!existing) {
			return {
				success: false,
				code: "LINE_NOT_FOUND",
				message: "Line not found",
				status: 404,
			};
		}

		if (code && code !== existing.code) {
			const duplicate = await tx.line.findUnique({ where: { code } });
			if (duplicate) {
				return {
					success: false,
					code: "LINE_CODE_DUPLICATE",
					message: "Line code already exists",
					status: 409,
				};
			}
		}

		const updated = await tx.line.update({
			where: { id: lineId },
			data: {
				code,
				name,
				processType: input.processType,
			},
		});

		return { success: true, data: toDetail(updated) };
	});
};

export const deleteLine = async (
	db: PrismaClient,
	lineId: string,
): Promise<ServiceResult<{ id: string }>> => {
	return await db.$transaction(async (tx) => {
		const line = await tx.line.findUnique({ where: { id: lineId } });
		if (!line) {
			return { success: false, code: "LINE_NOT_FOUND", message: "Line not found", status: 404 };
		}

		const counts = await buildLineDependencyCounts(tx, lineId);
		if (hasLineDependencies(counts)) {
			const segments: string[] = [];
			if (counts.stationCount > 0) segments.push("stations");
			if (counts.runCount > 0) segments.push("runs");
			if (counts.bindingCount > 0) segments.push("user bindings");
			if (counts.slotCount > 0) segments.push("feeder slots");
			if (counts.lineStencilCount > 0) segments.push("stencil bindings");
			if (counts.lineSolderPasteCount > 0) segments.push("solder paste bindings");
			if (counts.usageRecordCount > 0) segments.push("solder paste usage");
			if (counts.qcRuleCount > 0) segments.push("OQC rules");
			return {
				success: false,
				code: "LINE_HAS_DEPENDENCIES",
				message: `Line has dependent records (${segments.join(", ")}). Remove them before deleting.`,
				status: 409,
			};
		}

		await tx.line.delete({ where: { id: lineId } });
		return { success: true, data: { id: lineId } };
	});
};

export const updateLineProcessType = async (
	db: PrismaClient,
	lineId: string,
	processType: ProcessType,
): Promise<ServiceResult<LineDetail>> => {
	const line = await db.line.findUnique({
		where: { id: lineId },
	});

	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}

	const updated = await db.line.update({
		where: { id: lineId },
		data: { processType },
	});

	return { success: true, data: toDetail(updated) };
};
