import { InspectionStatus } from "@better-app/db";
import { t } from "elysia";

const inspectionStatusPattern = `^(${Object.values(InspectionStatus).join("|")})(,(${Object.values(InspectionStatus).join("|")}))*$`;

export const createFaiSchema = t.Object({
	sampleQty: t.Integer({ minimum: 1, description: "Number of samples to inspect" }),
	remark: t.Optional(t.String()),
});

export const recordFaiItemSchema = t.Object({
	unitSn: t.Optional(t.String({ description: "Sample unit SN" })),
	itemName: t.String({ description: "Inspection item name" }),
	itemSpec: t.Optional(t.String({ description: "Specification/standard" })),
	actualValue: t.Optional(t.String({ description: "Actual measured value" })),
	result: t.Union([t.Literal("PASS"), t.Literal("FAIL"), t.Literal("NA")], {
		description: "Inspection result",
	}),
	defectCode: t.Optional(t.String({ description: "Defect code if failed" })),
	remark: t.Optional(t.String()),
});

export const updateFaiItemSchema = t.Object({
	unitSn: t.Optional(t.String({ description: "Sample unit SN" })),
	itemSpec: t.Optional(t.String({ description: "Specification/standard" })),
	actualValue: t.Optional(t.String({ description: "Actual measured value" })),
	result: t.Optional(
		t.Union([t.Literal("PASS"), t.Literal("FAIL"), t.Literal("NA")], {
			description: "Inspection result",
		}),
	),
	defectCode: t.Optional(t.String({ description: "Defect code if failed" })),
	remark: t.Optional(t.String()),
});

export const faiItemResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		inspectionId: t.String(),
		unitSn: t.Union([t.String(), t.Null()]),
		itemName: t.String(),
		itemSpec: t.Union([t.String(), t.Null()]),
		actualValue: t.Union([t.String(), t.Null()]),
		result: t.Union([t.Literal("PASS"), t.Literal("FAIL"), t.Literal("NA")]),
		defectCode: t.Union([t.String(), t.Null()]),
		remark: t.Union([t.String(), t.Null()]),
		inspectedBy: t.Union([t.String(), t.Null()]),
		inspectedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
		createdAt: t.String({ format: "date-time" }),
		updatedAt: t.String({ format: "date-time" }),
	}),
});

export const completeFaiSchema = t.Object({
	decision: t.Union([t.Literal("PASS"), t.Literal("FAIL")], {
		description: "Final FAI decision",
	}),
	passedQty: t.Optional(t.Integer({ minimum: 0, description: "Number of passed samples" })),
	failedQty: t.Optional(t.Integer({ minimum: 0, description: "Number of failed samples" })),
	remark: t.Optional(t.String()),
});

export const faiQuerySchema = t.Object({
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String({ pattern: inspectionStatusPattern })),
	page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export const signFaiSchema = t.Object({
	remark: t.Optional(t.String({ description: "Optional signature remark" })),
});

export const faiErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
