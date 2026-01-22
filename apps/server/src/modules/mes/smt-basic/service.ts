import type {
	DailyQcRecord,
	EquipmentInspectionRecord,
	InspectionResultStatus,
	InspectionResultType,
	OvenProgramRecord,
	Prisma,
	PrismaClient,
	ProductionExceptionRecord,
	SqueegeeUsageRecord,
	StencilCleaningRecord,
	StencilUsageRecord,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

export type StencilUsageRecordDetail = {
	id: string;
	stencilId: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	recordDate: string;
	stencilThickness: number | null;
	productModel: string | null;
	printCount: number | null;
	totalPrintCount: number | null;
	replacedAt: string | null;
	checkDeform: boolean | null;
	checkHoleDamage: boolean | null;
	checkSealIntact: boolean | null;
	tensionValues: Prisma.JsonValue | null;
	usedBy: string | null;
	confirmedBy: string | null;
	remark: string | null;
	lifeLimit: number | null;
	createdAt: string;
	updatedAt: string;
};

export type StencilCleaningRecordDetail = {
	id: string;
	stencilId: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	cleanedAt: string;
	cleanedBy: string;
	confirmedBy: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type SqueegeeUsageRecordDetail = {
	id: string;
	squeegeeId: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	recordDate: string;
	productModel: string | null;
	squeegeeSpec: string | null;
	printCount: number | null;
	totalPrintCount: number | null;
	replacedAt: string | null;
	checkSurface: boolean | null;
	checkEdge: boolean | null;
	checkFlatness: boolean | null;
	usedBy: string | null;
	confirmedBy: string | null;
	remark: string | null;
	lifeLimit: number | null;
	createdAt: string;
	updatedAt: string;
};

export type FixtureUsageRecordDetail = {
	id: string;
	fixtureId: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	recordDate: string;
	usageCount: number | null;
	totalUsageCount: number | null;
	usedBy: string | null;
	confirmedBy: string | null;
	remark: string | null;
	lifeLimit: number | null;
	createdAt: string;
	updatedAt: string;
};

export type EquipmentInspectionRecordDetail = {
	id: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	equipmentType: InspectionResultType | null;
	inspectedAt: string;
	machineName: string;
	sampleModel: string | null;
	version: string | null;
	programName: string | null;
	result: InspectionResultStatus | null;
	inspector: string;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type OvenProgramRecordDetail = {
	id: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	equipmentId: string | null;
	recordDate: string;
	productName: string;
	programName: string;
	usedBy: string;
	confirmedBy: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type DailyQcRecordDetail = {
	id: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	customer: string | null;
	station: string | null;
	assemblyNumber: string | null;
	jobNo: string | null;
	jobQty: number | null;
	shiftCode: string | null;
	timeWindow: string | null;
	defectSummary: Prisma.JsonValue | null;
	yellowCardNo: string | null;
	totalParts: number | null;
	inspectedQty: number | null;
	defectBoardQty: number | null;
	defectBoardRate: number | null;
	defectQty: number | null;
	defectRate: number | null;
	correctiveAction: string | null;
	inspectedBy: string;
	inspectedAt: string;
	reviewedBy: string | null;
	reviewedAt: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ProductionExceptionRecordDetail = {
	id: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	jobNo: string | null;
	assemblyNumber: string | null;
	revision: string | null;
	shipDate: string | null;
	customer: string | null;
	qty: number | null;
	lineNo: string | null;
	downtimeMinutes: number | null;
	downtimeRange: string | null;
	impact: string | null;
	description: string;
	issuedBy: string;
	issuedAt: string;
	correctiveAction: string | null;
	confirmedBy: string | null;
	confirmedAt: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

type StencilUsageListQuery = {
	stencilId?: string;
	lineCode?: string;
	productModel?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type StencilUsageCreateInput = {
	stencilId: string;
	lineCode?: string;
	recordDate: string;
	stencilThickness?: number;
	productModel?: string;
	printCount?: number;
	totalPrintCount?: number;
	replacedAt?: string;
	checkDeform?: boolean;
	checkHoleDamage?: boolean;
	checkSealIntact?: boolean;
	tensionValues?: Prisma.JsonValue;
	usedBy?: string;
	confirmedBy?: string;
	remark?: string;
	lifeLimit?: number;
	meta?: Prisma.JsonValue;
};

type StencilCleaningListQuery = {
	stencilId?: string;
	lineCode?: string;
	cleanedBy?: string;
	cleanedFrom?: string;
	cleanedTo?: string;
	page?: number;
	pageSize?: number;
};

type StencilCleaningCreateInput = {
	stencilId: string;
	lineCode?: string;
	cleanedAt: string;
	cleanedBy: string;
	confirmedBy?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

type SqueegeeUsageListQuery = {
	squeegeeId?: string;
	lineCode?: string;
	productModel?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type SqueegeeUsageCreateInput = {
	squeegeeId: string;
	lineCode?: string;
	recordDate: string;
	productModel?: string;
	squeegeeSpec?: string;
	printCount?: number;
	totalPrintCount?: number;
	replacedAt?: string;
	checkSurface?: boolean;
	checkEdge?: boolean;
	checkFlatness?: boolean;
	usedBy?: string;
	confirmedBy?: string;
	remark?: string;
	lifeLimit?: number;
	meta?: Prisma.JsonValue;
};

type EquipmentInspectionListQuery = {
	lineCode?: string;
	equipmentType?: InspectionResultType;
	result?: InspectionResultStatus;
	machineName?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
};

type EquipmentInspectionCreateInput = {
	lineCode?: string;
	equipmentType?: InspectionResultType;
	inspectedAt: string;
	machineName: string;
	sampleModel?: string;
	version?: string;
	programName?: string;
	result?: InspectionResultStatus;
	inspector: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

type OvenProgramListQuery = {
	lineCode?: string;
	equipmentId?: string;
	productName?: string;
	programName?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type OvenProgramCreateInput = {
	lineCode?: string;
	equipmentId?: string;
	recordDate: string;
	productName: string;
	programName: string;
	usedBy: string;
	confirmedBy?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

type DailyQcListQuery = {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	station?: string;
	shiftCode?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
};

type DailyQcCreateInput = {
	lineCode?: string;
	customer?: string;
	station?: string;
	assemblyNumber?: string;
	jobNo?: string;
	jobQty?: number;
	shiftCode?: string;
	timeWindow?: string;
	defectSummary?: Prisma.JsonValue;
	yellowCardNo?: string;
	totalParts?: number;
	inspectedQty?: number;
	defectBoardQty?: number;
	defectBoardRate?: number;
	defectQty?: number;
	defectRate?: number;
	correctiveAction?: string;
	inspectedBy: string;
	inspectedAt: string;
	reviewedBy?: string;
	reviewedAt?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

type ProductionExceptionListQuery = {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
};

type ProductionExceptionCreateInput = {
	lineCode?: string;
	jobNo?: string;
	assemblyNumber?: string;
	revision?: string;
	shipDate?: string;
	customer?: string;
	qty?: number;
	lineNo?: string;
	downtimeMinutes?: number;
	downtimeRange?: string;
	impact?: string;
	description: string;
	issuedBy: string;
	issuedAt: string;
	correctiveAction?: string;
	confirmedBy?: string;
	confirmedAt?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

const mapLine = (record: { line?: { id: string; code: string; name: string } | null }) => ({
	lineId: record.line?.id ?? null,
	lineCode: record.line?.code ?? null,
	lineName: record.line?.name ?? null,
});

const mapStencilUsageRecord = (
	record: StencilUsageRecord & { line: { id: string; code: string; name: string } | null },
): StencilUsageRecordDetail => ({
	id: record.id,
	stencilId: record.stencilId,
	...mapLine(record),
	recordDate: record.recordDate.toISOString(),
	stencilThickness: record.stencilThickness ?? null,
	productModel: record.productModel ?? null,
	printCount: record.printCount ?? null,
	totalPrintCount: record.totalPrintCount ?? null,
	replacedAt: record.replacedAt ? record.replacedAt.toISOString() : null,
	checkDeform: record.checkDeform ?? null,
	checkHoleDamage: record.checkHoleDamage ?? null,
	checkSealIntact: record.checkSealIntact ?? null,
	tensionValues: record.tensionValues ?? null,
	usedBy: record.usedBy ?? null,
	confirmedBy: record.confirmedBy ?? null,
	remark: record.remark ?? null,
	lifeLimit: record.lifeLimit ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapStencilCleaningRecord = (
	record: StencilCleaningRecord & { line: { id: string; code: string; name: string } | null },
): StencilCleaningRecordDetail => ({
	id: record.id,
	stencilId: record.stencilId,
	...mapLine(record),
	cleanedAt: record.cleanedAt.toISOString(),
	cleanedBy: record.cleanedBy,
	confirmedBy: record.confirmedBy ?? null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapSqueegeeUsageRecord = (
	record: SqueegeeUsageRecord & { line: { id: string; code: string; name: string } | null },
): SqueegeeUsageRecordDetail => ({
	id: record.id,
	squeegeeId: record.squeegeeId,
	...mapLine(record),
	recordDate: record.recordDate.toISOString(),
	productModel: record.productModel ?? null,
	squeegeeSpec: record.squeegeeSpec ?? null,
	printCount: record.printCount ?? null,
	totalPrintCount: record.totalPrintCount ?? null,
	replacedAt: record.replacedAt ? record.replacedAt.toISOString() : null,
	checkSurface: record.checkSurface ?? null,
	checkEdge: record.checkEdge ?? null,
	checkFlatness: record.checkFlatness ?? null,
	usedBy: record.usedBy ?? null,
	confirmedBy: record.confirmedBy ?? null,
	remark: record.remark ?? null,
	lifeLimit: record.lifeLimit ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapEquipmentInspectionRecord = (
	record: EquipmentInspectionRecord & { line: { id: string; code: string; name: string } | null },
): EquipmentInspectionRecordDetail => ({
	id: record.id,
	...mapLine(record),
	equipmentType: record.equipmentType ?? null,
	inspectedAt: record.inspectedAt.toISOString(),
	machineName: record.machineName,
	sampleModel: record.sampleModel ?? null,
	version: record.version ?? null,
	programName: record.programName ?? null,
	result: record.result ?? null,
	inspector: record.inspector,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapOvenProgramRecord = (
	record: OvenProgramRecord & { line: { id: string; code: string; name: string } | null },
): OvenProgramRecordDetail => ({
	id: record.id,
	...mapLine(record),
	equipmentId: record.equipmentId ?? null,
	recordDate: record.recordDate.toISOString(),
	productName: record.productName,
	programName: record.programName,
	usedBy: record.usedBy,
	confirmedBy: record.confirmedBy ?? null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapDailyQcRecord = (
	record: DailyQcRecord & { line: { id: string; code: string; name: string } | null },
): DailyQcRecordDetail => ({
	id: record.id,
	...mapLine(record),
	customer: record.customer ?? null,
	station: record.station ?? null,
	assemblyNumber: record.assemblyNumber ?? null,
	jobNo: record.jobNo ?? null,
	jobQty: record.jobQty ?? null,
	shiftCode: record.shiftCode ?? null,
	timeWindow: record.timeWindow ?? null,
	defectSummary: record.defectSummary ?? null,
	yellowCardNo: record.yellowCardNo ?? null,
	totalParts: record.totalParts ?? null,
	inspectedQty: record.inspectedQty ?? null,
	defectBoardQty: record.defectBoardQty ?? null,
	defectBoardRate: record.defectBoardRate ?? null,
	defectQty: record.defectQty ?? null,
	defectRate: record.defectRate ?? null,
	correctiveAction: record.correctiveAction ?? null,
	inspectedBy: record.inspectedBy,
	inspectedAt: record.inspectedAt.toISOString(),
	reviewedBy: record.reviewedBy ?? null,
	reviewedAt: record.reviewedAt ? record.reviewedAt.toISOString() : null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapProductionExceptionRecord = (
	record: ProductionExceptionRecord & { line: { id: string; code: string; name: string } | null },
): ProductionExceptionRecordDetail => ({
	id: record.id,
	...mapLine(record),
	jobNo: record.jobNo ?? null,
	assemblyNumber: record.assemblyNumber ?? null,
	revision: record.revision ?? null,
	shipDate: record.shipDate ? record.shipDate.toISOString() : null,
	customer: record.customer ?? null,
	qty: record.qty ?? null,
	lineNo: record.lineNo ?? null,
	downtimeMinutes: record.downtimeMinutes ?? null,
	downtimeRange: record.downtimeRange ?? null,
	impact: record.impact ?? null,
	description: record.description,
	issuedBy: record.issuedBy,
	issuedAt: record.issuedAt.toISOString(),
	correctiveAction: record.correctiveAction ?? null,
	confirmedBy: record.confirmedBy ?? null,
	confirmedAt: record.confirmedAt ? record.confirmedAt.toISOString() : null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const parseDate = (value: string): Date | null => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
};

const resolveLineId = async (
	db: PrismaClient,
	lineCode?: string,
): Promise<ServiceResult<string | null>> => {
	const normalized = lineCode?.trim();
	if (!normalized) {
		return { success: true, data: null };
	}

	const line = await db.line.findUnique({ where: { code: normalized }, select: { id: true } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}

	return { success: true, data: line.id };
};

const resolveLineIdsForSearch = async (
	db: PrismaClient,
	lineCode: string,
): Promise<string[] | null> => {
	const lines = await db.line.findMany({
		where: { code: { contains: lineCode } },
		select: { id: true },
	});

	if (lines.length === 0) return null;
	return lines.map((line) => line.id);
};

const validateNonNegative = (value: number | undefined, code: string, message: string) => {
	if (value === undefined) return null;
	if (Number.isNaN(value) || value < 0) {
		return {
			success: false,
			code,
			message,
			status: 400,
		} as const;
	}
	return null;
};

export async function listStencilUsageRecords(
	db: PrismaClient,
	query: StencilUsageListQuery,
): Promise<{ items: StencilUsageRecordDetail[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.StencilUsageRecordWhereInput = {};

	const stencilId = query.stencilId?.trim();
	if (stencilId) {
		where.stencilId = { contains: stencilId };
	}

	const productModel = query.productModel?.trim();
	if (productModel) {
		where.productModel = { contains: productModel };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const recordFrom = query.recordFrom ? parseDate(query.recordFrom) : null;
	const recordTo = query.recordTo ? parseDate(query.recordTo) : null;
	if (recordFrom || recordTo) {
		where.recordDate = {
			...(recordFrom ? { gte: recordFrom } : {}),
			...(recordTo ? { lte: recordTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.stencilUsageRecord.findMany({
			where,
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.stencilUsageRecord.count({ where }),
	]);

	return { items: items.map(mapStencilUsageRecord), total, page, pageSize };
}

export async function createStencilUsageRecord(
	db: PrismaClient,
	input: StencilUsageCreateInput,
): Promise<ServiceResult<StencilUsageRecordDetail>> {
	const stencilId = input.stencilId.trim();
	if (!stencilId) {
		return {
			success: false,
			code: "STENCIL_ID_REQUIRED",
			message: "stencilId is required",
			status: 400,
		};
	}

	const recordDate = parseDate(input.recordDate);
	if (!recordDate) {
		return {
			success: false,
			code: "INVALID_RECORD_DATE",
			message: "Invalid recordDate timestamp",
			status: 400,
		};
	}

	const replacedAt = input.replacedAt ? parseDate(input.replacedAt) : null;
	if (input.replacedAt && !replacedAt) {
		return {
			success: false,
			code: "INVALID_REPLACED_AT",
			message: "Invalid replacedAt timestamp",
			status: 400,
		};
	}

	const printCountError = validateNonNegative(
		input.printCount,
		"INVALID_PRINT_COUNT",
		"printCount must be greater than or equal to 0",
	);
	if (printCountError) return printCountError;

	const totalPrintCountError = validateNonNegative(
		input.totalPrintCount,
		"INVALID_TOTAL_PRINT_COUNT",
		"totalPrintCount must be greater than or equal to 0",
	);
	if (totalPrintCountError) return totalPrintCountError;

	const lifeLimitError = validateNonNegative(
		input.lifeLimit,
		"INVALID_LIFE_LIMIT",
		"lifeLimit must be greater than or equal to 0",
	);
	if (lifeLimitError) return lifeLimitError;

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.stencilUsageRecord.create({
		data: {
			stencilId,
			lineId: lineResult.data,
			recordDate,
			stencilThickness: input.stencilThickness ?? null,
			productModel: input.productModel?.trim() || null,
			printCount: input.printCount ?? null,
			totalPrintCount: input.totalPrintCount ?? null,
			replacedAt,
			checkDeform: input.checkDeform ?? null,
			checkHoleDamage: input.checkHoleDamage ?? null,
			checkSealIntact: input.checkSealIntact ?? null,
			tensionValues: input.tensionValues ?? undefined,
			usedBy: input.usedBy?.trim() || null,
			confirmedBy: input.confirmedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			lifeLimit: input.lifeLimit ?? null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapStencilUsageRecord(record) };
}

export async function listStencilCleaningRecords(
	db: PrismaClient,
	query: StencilCleaningListQuery,
): Promise<{
	items: StencilCleaningRecordDetail[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.StencilCleaningRecordWhereInput = {};

	const stencilId = query.stencilId?.trim();
	if (stencilId) {
		where.stencilId = { contains: stencilId };
	}

	const cleanedBy = query.cleanedBy?.trim();
	if (cleanedBy) {
		where.cleanedBy = { contains: cleanedBy };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const cleanedFrom = query.cleanedFrom ? parseDate(query.cleanedFrom) : null;
	const cleanedTo = query.cleanedTo ? parseDate(query.cleanedTo) : null;
	if (cleanedFrom || cleanedTo) {
		where.cleanedAt = {
			...(cleanedFrom ? { gte: cleanedFrom } : {}),
			...(cleanedTo ? { lte: cleanedTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.stencilCleaningRecord.findMany({
			where,
			orderBy: [{ cleanedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.stencilCleaningRecord.count({ where }),
	]);

	return { items: items.map(mapStencilCleaningRecord), total, page, pageSize };
}

export async function createStencilCleaningRecord(
	db: PrismaClient,
	input: StencilCleaningCreateInput,
): Promise<ServiceResult<StencilCleaningRecordDetail>> {
	const stencilId = input.stencilId.trim();
	if (!stencilId) {
		return {
			success: false,
			code: "STENCIL_ID_REQUIRED",
			message: "stencilId is required",
			status: 400,
		};
	}

	const cleanedBy = input.cleanedBy.trim();
	if (!cleanedBy) {
		return {
			success: false,
			code: "CLEANED_BY_REQUIRED",
			message: "cleanedBy is required",
			status: 400,
		};
	}

	const cleanedAt = parseDate(input.cleanedAt);
	if (!cleanedAt) {
		return {
			success: false,
			code: "INVALID_CLEANED_AT",
			message: "Invalid cleanedAt timestamp",
			status: 400,
		};
	}

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.stencilCleaningRecord.create({
		data: {
			stencilId,
			lineId: lineResult.data,
			cleanedAt,
			cleanedBy,
			confirmedBy: input.confirmedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapStencilCleaningRecord(record) };
}

export async function listSqueegeeUsageRecords(
	db: PrismaClient,
	query: SqueegeeUsageListQuery,
): Promise<{ items: SqueegeeUsageRecordDetail[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.SqueegeeUsageRecordWhereInput = {};

	const squeegeeId = query.squeegeeId?.trim();
	if (squeegeeId) {
		where.squeegeeId = { contains: squeegeeId };
	}

	const productModel = query.productModel?.trim();
	if (productModel) {
		where.productModel = { contains: productModel };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const recordFrom = query.recordFrom ? parseDate(query.recordFrom) : null;
	const recordTo = query.recordTo ? parseDate(query.recordTo) : null;
	if (recordFrom || recordTo) {
		where.recordDate = {
			...(recordFrom ? { gte: recordFrom } : {}),
			...(recordTo ? { lte: recordTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.squeegeeUsageRecord.findMany({
			where,
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.squeegeeUsageRecord.count({ where }),
	]);

	return { items: items.map(mapSqueegeeUsageRecord), total, page, pageSize };
}

export async function createSqueegeeUsageRecord(
	db: PrismaClient,
	input: SqueegeeUsageCreateInput,
): Promise<ServiceResult<SqueegeeUsageRecordDetail>> {
	const squeegeeId = input.squeegeeId.trim();
	if (!squeegeeId) {
		return {
			success: false,
			code: "SQUEEGEE_ID_REQUIRED",
			message: "squeegeeId is required",
			status: 400,
		};
	}

	const recordDate = parseDate(input.recordDate);
	if (!recordDate) {
		return {
			success: false,
			code: "INVALID_RECORD_DATE",
			message: "Invalid recordDate timestamp",
			status: 400,
		};
	}

	const replacedAt = input.replacedAt ? parseDate(input.replacedAt) : null;
	if (input.replacedAt && !replacedAt) {
		return {
			success: false,
			code: "INVALID_REPLACED_AT",
			message: "Invalid replacedAt timestamp",
			status: 400,
		};
	}

	const printCountError = validateNonNegative(
		input.printCount,
		"INVALID_PRINT_COUNT",
		"printCount must be greater than or equal to 0",
	);
	if (printCountError) return printCountError;

	const totalPrintCountError = validateNonNegative(
		input.totalPrintCount,
		"INVALID_TOTAL_PRINT_COUNT",
		"totalPrintCount must be greater than or equal to 0",
	);
	if (totalPrintCountError) return totalPrintCountError;

	const lifeLimitError = validateNonNegative(
		input.lifeLimit,
		"INVALID_LIFE_LIMIT",
		"lifeLimit must be greater than or equal to 0",
	);
	if (lifeLimitError) return lifeLimitError;

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.squeegeeUsageRecord.create({
		data: {
			squeegeeId,
			lineId: lineResult.data,
			recordDate,
			productModel: input.productModel?.trim() || null,
			squeegeeSpec: input.squeegeeSpec?.trim() || null,
			printCount: input.printCount ?? null,
			totalPrintCount: input.totalPrintCount ?? null,
			replacedAt,
			checkSurface: input.checkSurface ?? null,
			checkEdge: input.checkEdge ?? null,
			checkFlatness: input.checkFlatness ?? null,
			usedBy: input.usedBy?.trim() || null,
			confirmedBy: input.confirmedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			lifeLimit: input.lifeLimit ?? null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapSqueegeeUsageRecord(record) };
}

export async function listEquipmentInspectionRecords(
	db: PrismaClient,
	query: EquipmentInspectionListQuery,
): Promise<{
	items: EquipmentInspectionRecordDetail[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.EquipmentInspectionRecordWhereInput = {};

	const machineName = query.machineName?.trim();
	if (machineName) {
		where.machineName = { contains: machineName };
	}

	if (query.equipmentType) {
		where.equipmentType = query.equipmentType;
	}

	if (query.result) {
		where.result = query.result;
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const inspectedFrom = query.inspectedFrom ? parseDate(query.inspectedFrom) : null;
	const inspectedTo = query.inspectedTo ? parseDate(query.inspectedTo) : null;
	if (inspectedFrom || inspectedTo) {
		where.inspectedAt = {
			...(inspectedFrom ? { gte: inspectedFrom } : {}),
			...(inspectedTo ? { lte: inspectedTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.equipmentInspectionRecord.findMany({
			where,
			orderBy: [{ inspectedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.equipmentInspectionRecord.count({ where }),
	]);

	return { items: items.map(mapEquipmentInspectionRecord), total, page, pageSize };
}

export async function createEquipmentInspectionRecord(
	db: PrismaClient,
	input: EquipmentInspectionCreateInput,
): Promise<ServiceResult<EquipmentInspectionRecordDetail>> {
	const machineName = input.machineName.trim();
	if (!machineName) {
		return {
			success: false,
			code: "MACHINE_NAME_REQUIRED",
			message: "machineName is required",
			status: 400,
		};
	}

	const inspector = input.inspector.trim();
	if (!inspector) {
		return {
			success: false,
			code: "INSPECTOR_REQUIRED",
			message: "inspector is required",
			status: 400,
		};
	}

	const inspectedAt = parseDate(input.inspectedAt);
	if (!inspectedAt) {
		return {
			success: false,
			code: "INVALID_INSPECTED_AT",
			message: "Invalid inspectedAt timestamp",
			status: 400,
		};
	}

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.equipmentInspectionRecord.create({
		data: {
			lineId: lineResult.data,
			equipmentType: input.equipmentType ?? null,
			inspectedAt,
			machineName,
			sampleModel: input.sampleModel?.trim() || null,
			version: input.version?.trim() || null,
			programName: input.programName?.trim() || null,
			result: input.result ?? null,
			inspector,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapEquipmentInspectionRecord(record) };
}

export async function listOvenProgramRecords(
	db: PrismaClient,
	query: OvenProgramListQuery,
): Promise<{ items: OvenProgramRecordDetail[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.OvenProgramRecordWhereInput = {};

	const equipmentId = query.equipmentId?.trim();
	if (equipmentId) {
		where.equipmentId = { contains: equipmentId };
	}

	const productName = query.productName?.trim();
	if (productName) {
		where.productName = { contains: productName };
	}

	const programName = query.programName?.trim();
	if (programName) {
		where.programName = { contains: programName };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const recordFrom = query.recordFrom ? parseDate(query.recordFrom) : null;
	const recordTo = query.recordTo ? parseDate(query.recordTo) : null;
	if (recordFrom || recordTo) {
		where.recordDate = {
			...(recordFrom ? { gte: recordFrom } : {}),
			...(recordTo ? { lte: recordTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.ovenProgramRecord.findMany({
			where,
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.ovenProgramRecord.count({ where }),
	]);

	return { items: items.map(mapOvenProgramRecord), total, page, pageSize };
}

export async function createOvenProgramRecord(
	db: PrismaClient,
	input: OvenProgramCreateInput,
): Promise<ServiceResult<OvenProgramRecordDetail>> {
	const productName = input.productName.trim();
	if (!productName) {
		return {
			success: false,
			code: "PRODUCT_NAME_REQUIRED",
			message: "productName is required",
			status: 400,
		};
	}

	const programName = input.programName.trim();
	if (!programName) {
		return {
			success: false,
			code: "PROGRAM_NAME_REQUIRED",
			message: "programName is required",
			status: 400,
		};
	}

	const usedBy = input.usedBy.trim();
	if (!usedBy) {
		return { success: false, code: "USED_BY_REQUIRED", message: "usedBy is required", status: 400 };
	}

	const recordDate = parseDate(input.recordDate);
	if (!recordDate) {
		return {
			success: false,
			code: "INVALID_RECORD_DATE",
			message: "Invalid recordDate timestamp",
			status: 400,
		};
	}

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.ovenProgramRecord.create({
		data: {
			lineId: lineResult.data,
			equipmentId: input.equipmentId?.trim() || null,
			recordDate,
			productName,
			programName,
			usedBy,
			confirmedBy: input.confirmedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapOvenProgramRecord(record) };
}

export async function listDailyQcRecords(
	db: PrismaClient,
	query: DailyQcListQuery,
): Promise<{ items: DailyQcRecordDetail[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.DailyQcRecordWhereInput = {};

	const jobNo = query.jobNo?.trim();
	if (jobNo) {
		where.jobNo = { contains: jobNo };
	}

	const customer = query.customer?.trim();
	if (customer) {
		where.customer = { contains: customer };
	}

	const station = query.station?.trim();
	if (station) {
		where.station = { contains: station };
	}

	const shiftCode = query.shiftCode?.trim();
	if (shiftCode) {
		where.shiftCode = { contains: shiftCode };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const inspectedFrom = query.inspectedFrom ? parseDate(query.inspectedFrom) : null;
	const inspectedTo = query.inspectedTo ? parseDate(query.inspectedTo) : null;
	if (inspectedFrom || inspectedTo) {
		where.inspectedAt = {
			...(inspectedFrom ? { gte: inspectedFrom } : {}),
			...(inspectedTo ? { lte: inspectedTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.dailyQcRecord.findMany({
			where,
			orderBy: [{ inspectedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.dailyQcRecord.count({ where }),
	]);

	return { items: items.map(mapDailyQcRecord), total, page, pageSize };
}

export async function createDailyQcRecord(
	db: PrismaClient,
	input: DailyQcCreateInput,
): Promise<ServiceResult<DailyQcRecordDetail>> {
	const inspectedBy = input.inspectedBy.trim();
	if (!inspectedBy) {
		return {
			success: false,
			code: "INSPECTED_BY_REQUIRED",
			message: "inspectedBy is required",
			status: 400,
		};
	}

	const inspectedAt = parseDate(input.inspectedAt);
	if (!inspectedAt) {
		return {
			success: false,
			code: "INVALID_INSPECTED_AT",
			message: "Invalid inspectedAt timestamp",
			status: 400,
		};
	}

	const reviewedAt = input.reviewedAt ? parseDate(input.reviewedAt) : null;
	if (input.reviewedAt && !reviewedAt) {
		return {
			success: false,
			code: "INVALID_REVIEWED_AT",
			message: "Invalid reviewedAt timestamp",
			status: 400,
		};
	}

	const jobQtyError = validateNonNegative(
		input.jobQty,
		"INVALID_JOB_QTY",
		"jobQty must be greater than or equal to 0",
	);
	if (jobQtyError) return jobQtyError;

	const totalPartsError = validateNonNegative(
		input.totalParts,
		"INVALID_TOTAL_PARTS",
		"totalParts must be greater than or equal to 0",
	);
	if (totalPartsError) return totalPartsError;

	const inspectedQtyError = validateNonNegative(
		input.inspectedQty,
		"INVALID_INSPECTED_QTY",
		"inspectedQty must be greater than or equal to 0",
	);
	if (inspectedQtyError) return inspectedQtyError;

	const defectBoardQtyError = validateNonNegative(
		input.defectBoardQty,
		"INVALID_DEFECT_BOARD_QTY",
		"defectBoardQty must be greater than or equal to 0",
	);
	if (defectBoardQtyError) return defectBoardQtyError;

	const defectQtyError = validateNonNegative(
		input.defectQty,
		"INVALID_DEFECT_QTY",
		"defectQty must be greater than or equal to 0",
	);
	if (defectQtyError) return defectQtyError;

	const defectBoardRateError = validateNonNegative(
		input.defectBoardRate,
		"INVALID_DEFECT_BOARD_RATE",
		"defectBoardRate must be greater than or equal to 0",
	);
	if (defectBoardRateError) return defectBoardRateError;

	const defectRateError = validateNonNegative(
		input.defectRate,
		"INVALID_DEFECT_RATE",
		"defectRate must be greater than or equal to 0",
	);
	if (defectRateError) return defectRateError;

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.dailyQcRecord.create({
		data: {
			lineId: lineResult.data,
			customer: input.customer?.trim() || null,
			station: input.station?.trim() || null,
			assemblyNumber: input.assemblyNumber?.trim() || null,
			jobNo: input.jobNo?.trim() || null,
			jobQty: input.jobQty ?? null,
			shiftCode: input.shiftCode?.trim() || null,
			timeWindow: input.timeWindow?.trim() || null,
			defectSummary: input.defectSummary ?? undefined,
			yellowCardNo: input.yellowCardNo?.trim() || null,
			totalParts: input.totalParts ?? null,
			inspectedQty: input.inspectedQty ?? null,
			defectBoardQty: input.defectBoardQty ?? null,
			defectBoardRate: input.defectBoardRate ?? null,
			defectQty: input.defectQty ?? null,
			defectRate: input.defectRate ?? null,
			correctiveAction: input.correctiveAction?.trim() || null,
			inspectedBy,
			inspectedAt,
			reviewedBy: input.reviewedBy?.trim() || null,
			reviewedAt,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapDailyQcRecord(record) };
}

export async function listProductionExceptionRecords(
	db: PrismaClient,
	query: ProductionExceptionListQuery,
): Promise<{
	items: ProductionExceptionRecordDetail[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.ProductionExceptionRecordWhereInput = {};

	const jobNo = query.jobNo?.trim();
	if (jobNo) {
		where.jobNo = { contains: jobNo };
	}

	const customer = query.customer?.trim();
	if (customer) {
		where.customer = { contains: customer };
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lineIds = await resolveLineIdsForSearch(db, lineCode);
		if (!lineIds) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lineIds };
	}

	const issuedFrom = query.issuedFrom ? parseDate(query.issuedFrom) : null;
	const issuedTo = query.issuedTo ? parseDate(query.issuedTo) : null;
	if (issuedFrom || issuedTo) {
		where.issuedAt = {
			...(issuedFrom ? { gte: issuedFrom } : {}),
			...(issuedTo ? { lte: issuedTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.productionExceptionRecord.findMany({
			where,
			orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { line: { select: { id: true, code: true, name: true } } },
		}),
		db.productionExceptionRecord.count({ where }),
	]);

	return { items: items.map(mapProductionExceptionRecord), total, page, pageSize };
}

export async function createProductionExceptionRecord(
	db: PrismaClient,
	input: ProductionExceptionCreateInput,
): Promise<ServiceResult<ProductionExceptionRecordDetail>> {
	const description = input.description.trim();
	if (!description) {
		return {
			success: false,
			code: "DESCRIPTION_REQUIRED",
			message: "description is required",
			status: 400,
		};
	}

	const issuedBy = input.issuedBy.trim();
	if (!issuedBy) {
		return {
			success: false,
			code: "ISSUED_BY_REQUIRED",
			message: "issuedBy is required",
			status: 400,
		};
	}

	const issuedAt = parseDate(input.issuedAt);
	if (!issuedAt) {
		return {
			success: false,
			code: "INVALID_ISSUED_AT",
			message: "Invalid issuedAt timestamp",
			status: 400,
		};
	}

	const confirmedAt = input.confirmedAt ? parseDate(input.confirmedAt) : null;
	if (input.confirmedAt && !confirmedAt) {
		return {
			success: false,
			code: "INVALID_CONFIRMED_AT",
			message: "Invalid confirmedAt timestamp",
			status: 400,
		};
	}

	const shipDate = input.shipDate ? parseDate(input.shipDate) : null;
	if (input.shipDate && !shipDate) {
		return {
			success: false,
			code: "INVALID_SHIP_DATE",
			message: "Invalid shipDate timestamp",
			status: 400,
		};
	}

	const qtyError = validateNonNegative(
		input.qty,
		"INVALID_QTY",
		"qty must be greater than or equal to 0",
	);
	if (qtyError) return qtyError;

	const downtimeError = validateNonNegative(
		input.downtimeMinutes,
		"INVALID_DOWNTIME",
		"downtimeMinutes must be greater than or equal to 0",
	);
	if (downtimeError) return downtimeError;

	const lineResult = await resolveLineId(db, input.lineCode);
	if (!lineResult.success) return lineResult;

	const record = await db.productionExceptionRecord.create({
		data: {
			lineId: lineResult.data,
			jobNo: input.jobNo?.trim() || null,
			assemblyNumber: input.assemblyNumber?.trim() || null,
			revision: input.revision?.trim() || null,
			shipDate,
			customer: input.customer?.trim() || null,
			qty: input.qty ?? null,
			lineNo: input.lineNo?.trim() || null,
			downtimeMinutes: input.downtimeMinutes ?? null,
			downtimeRange: input.downtimeRange?.trim() || null,
			impact: input.impact?.trim() || null,
			description,
			issuedBy,
			issuedAt,
			correctiveAction: input.correctiveAction?.trim() || null,
			confirmedBy: input.confirmedBy?.trim() || null,
			confirmedAt,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: { line: { select: { id: true, code: true, name: true } } },
	});

	return { success: true, data: mapProductionExceptionRecord(record) };
}
