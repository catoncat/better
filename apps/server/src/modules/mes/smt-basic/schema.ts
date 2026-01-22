import { t } from "elysia";

const inspectionTypeSchema = t.Union([t.Literal("SPI"), t.Literal("AOI")]);
const inspectionResultSchema = t.Union([t.Literal("PASS"), t.Literal("FAIL")]);

export const stencilUsageRecordSchema = t.Object({
	id: t.String(),
	stencilId: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	recordDate: t.String({ format: "date-time" }),
	stencilThickness: t.Union([t.Number(), t.Null()]),
	productModel: t.Union([t.String(), t.Null()]),
	printCount: t.Union([t.Number(), t.Null()]),
	totalPrintCount: t.Union([t.Number(), t.Null()]),
	replacedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	checkDeform: t.Union([t.Boolean(), t.Null()]),
	checkHoleDamage: t.Union([t.Boolean(), t.Null()]),
	checkSealIntact: t.Union([t.Boolean(), t.Null()]),
	tensionValues: t.Union([t.Any(), t.Null()]),
	usedBy: t.Union([t.String(), t.Null()]),
	confirmedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	lifeLimit: t.Union([t.Number(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const stencilUsageCreateSchema = t.Object({
	stencilId: t.String({ minLength: 1 }),
	lineCode: t.Optional(t.String()),
	recordDate: t.String({ format: "date-time" }),
	stencilThickness: t.Optional(t.Number()),
	productModel: t.Optional(t.String()),
	printCount: t.Optional(t.Number()),
	totalPrintCount: t.Optional(t.Number()),
	replacedAt: t.Optional(t.String({ format: "date-time" })),
	checkDeform: t.Optional(t.Boolean()),
	checkHoleDamage: t.Optional(t.Boolean()),
	checkSealIntact: t.Optional(t.Boolean()),
	tensionValues: t.Optional(t.Any()),
	usedBy: t.Optional(t.String()),
	confirmedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	lifeLimit: t.Optional(t.Number()),
	meta: t.Optional(t.Any()),
});

export const stencilUsageListQuerySchema = t.Object({
	stencilId: t.Optional(t.String()),
	lineCode: t.Optional(t.String()),
	productModel: t.Optional(t.String()),
	recordFrom: t.Optional(t.String({ format: "date-time" })),
	recordTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const stencilUsageListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(stencilUsageRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const stencilUsageResponseSchema = t.Object({
	ok: t.Boolean(),
	data: stencilUsageRecordSchema,
});

export const stencilCleaningRecordSchema = t.Object({
	id: t.String(),
	stencilId: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	cleanedAt: t.String({ format: "date-time" }),
	cleanedBy: t.String(),
	confirmedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const stencilCleaningCreateSchema = t.Object({
	stencilId: t.String({ minLength: 1 }),
	lineCode: t.Optional(t.String()),
	cleanedAt: t.String({ format: "date-time" }),
	cleanedBy: t.String({ minLength: 1 }),
	confirmedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const stencilCleaningListQuerySchema = t.Object({
	stencilId: t.Optional(t.String()),
	lineCode: t.Optional(t.String()),
	cleanedBy: t.Optional(t.String()),
	cleanedFrom: t.Optional(t.String({ format: "date-time" })),
	cleanedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const stencilCleaningListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(stencilCleaningRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const stencilCleaningResponseSchema = t.Object({
	ok: t.Boolean(),
	data: stencilCleaningRecordSchema,
});

export const squeegeeUsageRecordSchema = t.Object({
	id: t.String(),
	squeegeeId: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	recordDate: t.String({ format: "date-time" }),
	productModel: t.Union([t.String(), t.Null()]),
	squeegeeSpec: t.Union([t.String(), t.Null()]),
	printCount: t.Union([t.Number(), t.Null()]),
	totalPrintCount: t.Union([t.Number(), t.Null()]),
	replacedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	checkSurface: t.Union([t.Boolean(), t.Null()]),
	checkEdge: t.Union([t.Boolean(), t.Null()]),
	checkFlatness: t.Union([t.Boolean(), t.Null()]),
	usedBy: t.Union([t.String(), t.Null()]),
	confirmedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	lifeLimit: t.Union([t.Number(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const squeegeeUsageCreateSchema = t.Object({
	squeegeeId: t.String({ minLength: 1 }),
	lineCode: t.Optional(t.String()),
	recordDate: t.String({ format: "date-time" }),
	productModel: t.Optional(t.String()),
	squeegeeSpec: t.Optional(t.String()),
	printCount: t.Optional(t.Number()),
	totalPrintCount: t.Optional(t.Number()),
	replacedAt: t.Optional(t.String({ format: "date-time" })),
	checkSurface: t.Boolean(),
	checkEdge: t.Boolean(),
	checkFlatness: t.Boolean(),
	usedBy: t.Optional(t.String()),
	confirmedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	lifeLimit: t.Optional(t.Number()),
	meta: t.Optional(t.Any()),
});

export const squeegeeUsageListQuerySchema = t.Object({
	squeegeeId: t.Optional(t.String()),
	lineCode: t.Optional(t.String()),
	productModel: t.Optional(t.String()),
	recordFrom: t.Optional(t.String({ format: "date-time" })),
	recordTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const squeegeeUsageListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(squeegeeUsageRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const squeegeeUsageResponseSchema = t.Object({
	ok: t.Boolean(),
	data: squeegeeUsageRecordSchema,
});

export const equipmentInspectionRecordSchema = t.Object({
	id: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	equipmentType: t.Union([inspectionTypeSchema, t.Null()]),
	inspectedAt: t.String({ format: "date-time" }),
	machineName: t.String(),
	sampleModel: t.Union([t.String(), t.Null()]),
	version: t.Union([t.String(), t.Null()]),
	programName: t.Union([t.String(), t.Null()]),
	result: t.Union([inspectionResultSchema, t.Null()]),
	inspector: t.String(),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const equipmentInspectionCreateSchema = t.Object({
	lineCode: t.Optional(t.String()),
	equipmentType: t.Optional(inspectionTypeSchema),
	inspectedAt: t.String({ format: "date-time" }),
	machineName: t.String({ minLength: 1 }),
	sampleModel: t.Optional(t.String()),
	version: t.Optional(t.String()),
	programName: t.Optional(t.String()),
	result: t.Optional(inspectionResultSchema),
	inspector: t.String({ minLength: 1 }),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const equipmentInspectionListQuerySchema = t.Object({
	lineCode: t.Optional(t.String()),
	equipmentType: t.Optional(inspectionTypeSchema),
	result: t.Optional(inspectionResultSchema),
	machineName: t.Optional(t.String()),
	inspectedFrom: t.Optional(t.String({ format: "date-time" })),
	inspectedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const equipmentInspectionListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(equipmentInspectionRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const equipmentInspectionResponseSchema = t.Object({
	ok: t.Boolean(),
	data: equipmentInspectionRecordSchema,
});

export const ovenProgramRecordSchema = t.Object({
	id: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	equipmentId: t.Union([t.String(), t.Null()]),
	recordDate: t.String({ format: "date-time" }),
	productName: t.String(),
	programName: t.String(),
	usedBy: t.String(),
	confirmedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const ovenProgramCreateSchema = t.Object({
	lineCode: t.Optional(t.String()),
	equipmentId: t.Optional(t.String()),
	recordDate: t.String({ format: "date-time" }),
	productName: t.String({ minLength: 1 }),
	programName: t.String({ minLength: 1 }),
	usedBy: t.String({ minLength: 1 }),
	confirmedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const ovenProgramListQuerySchema = t.Object({
	lineCode: t.Optional(t.String()),
	equipmentId: t.Optional(t.String()),
	productName: t.Optional(t.String()),
	programName: t.Optional(t.String()),
	recordFrom: t.Optional(t.String({ format: "date-time" })),
	recordTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const ovenProgramListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(ovenProgramRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const ovenProgramResponseSchema = t.Object({
	ok: t.Boolean(),
	data: ovenProgramRecordSchema,
});

export const dailyQcRecordSchema = t.Object({
	id: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	customer: t.Union([t.String(), t.Null()]),
	station: t.Union([t.String(), t.Null()]),
	assemblyNumber: t.Union([t.String(), t.Null()]),
	jobNo: t.Union([t.String(), t.Null()]),
	jobQty: t.Union([t.Number(), t.Null()]),
	shiftCode: t.Union([t.String(), t.Null()]),
	timeWindow: t.Union([t.String(), t.Null()]),
	defectSummary: t.Union([t.Any(), t.Null()]),
	yellowCardNo: t.Union([t.String(), t.Null()]),
	totalParts: t.Union([t.Number(), t.Null()]),
	inspectedQty: t.Union([t.Number(), t.Null()]),
	defectBoardQty: t.Union([t.Number(), t.Null()]),
	defectBoardRate: t.Union([t.Number(), t.Null()]),
	defectQty: t.Union([t.Number(), t.Null()]),
	defectRate: t.Union([t.Number(), t.Null()]),
	correctiveAction: t.Union([t.String(), t.Null()]),
	inspectedBy: t.String(),
	inspectedAt: t.String({ format: "date-time" }),
	reviewedBy: t.Union([t.String(), t.Null()]),
	reviewedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const dailyQcCreateSchema = t.Object({
	lineCode: t.Optional(t.String()),
	customer: t.Optional(t.String()),
	station: t.Optional(t.String()),
	assemblyNumber: t.Optional(t.String()),
	jobNo: t.Optional(t.String()),
	jobQty: t.Optional(t.Number()),
	shiftCode: t.Optional(t.String()),
	timeWindow: t.Optional(t.String()),
	defectSummary: t.Optional(t.Any()),
	yellowCardNo: t.Optional(t.String()),
	totalParts: t.Optional(t.Number()),
	inspectedQty: t.Optional(t.Number()),
	defectBoardQty: t.Optional(t.Number()),
	defectBoardRate: t.Optional(t.Number()),
	defectQty: t.Optional(t.Number()),
	defectRate: t.Optional(t.Number()),
	correctiveAction: t.Optional(t.String()),
	inspectedBy: t.String({ minLength: 1 }),
	inspectedAt: t.String({ format: "date-time" }),
	reviewedBy: t.Optional(t.String()),
	reviewedAt: t.Optional(t.String({ format: "date-time" })),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const dailyQcListQuerySchema = t.Object({
	lineCode: t.Optional(t.String()),
	jobNo: t.Optional(t.String()),
	customer: t.Optional(t.String()),
	station: t.Optional(t.String()),
	shiftCode: t.Optional(t.String()),
	inspectedFrom: t.Optional(t.String({ format: "date-time" })),
	inspectedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const dailyQcListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(dailyQcRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const dailyQcResponseSchema = t.Object({
	ok: t.Boolean(),
	data: dailyQcRecordSchema,
});

export const productionExceptionRecordSchema = t.Object({
	id: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	jobNo: t.Union([t.String(), t.Null()]),
	assemblyNumber: t.Union([t.String(), t.Null()]),
	revision: t.Union([t.String(), t.Null()]),
	shipDate: t.Union([t.String({ format: "date-time" }), t.Null()]),
	customer: t.Union([t.String(), t.Null()]),
	qty: t.Union([t.Number(), t.Null()]),
	lineNo: t.Union([t.String(), t.Null()]),
	downtimeMinutes: t.Union([t.Number(), t.Null()]),
	downtimeRange: t.Union([t.String(), t.Null()]),
	impact: t.Union([t.String(), t.Null()]),
	description: t.String(),
	issuedBy: t.String(),
	issuedAt: t.String({ format: "date-time" }),
	correctiveAction: t.Union([t.String(), t.Null()]),
	confirmedBy: t.Union([t.String(), t.Null()]),
	confirmedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const productionExceptionCreateSchema = t.Object({
	lineCode: t.Optional(t.String()),
	jobNo: t.Optional(t.String()),
	assemblyNumber: t.Optional(t.String()),
	revision: t.Optional(t.String()),
	shipDate: t.Optional(t.String({ format: "date-time" })),
	customer: t.Optional(t.String()),
	qty: t.Optional(t.Number()),
	lineNo: t.Optional(t.String()),
	downtimeMinutes: t.Optional(t.Number()),
	downtimeRange: t.Optional(t.String()),
	impact: t.Optional(t.String()),
	description: t.String({ minLength: 1 }),
	issuedBy: t.String({ minLength: 1 }),
	issuedAt: t.String({ format: "date-time" }),
	correctiveAction: t.Optional(t.String()),
	confirmedBy: t.Optional(t.String()),
	confirmedAt: t.Optional(t.String({ format: "date-time" })),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const productionExceptionListQuerySchema = t.Object({
	lineCode: t.Optional(t.String()),
	jobNo: t.Optional(t.String()),
	customer: t.Optional(t.String()),
	issuedFrom: t.Optional(t.String({ format: "date-time" })),
	issuedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const productionExceptionListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(productionExceptionRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const productionExceptionResponseSchema = t.Object({
	ok: t.Boolean(),
	data: productionExceptionRecordSchema,
});
