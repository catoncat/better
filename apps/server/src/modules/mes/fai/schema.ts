import { t } from "elysia";

export const createFaiSchema = t.Object({
	sampleQty: t.Number({ minimum: 1, description: "Number of samples to inspect" }),
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

export const completeFaiSchema = t.Object({
	decision: t.Union([t.Literal("PASS"), t.Literal("FAIL")], {
		description: "Final FAI decision",
	}),
	passedQty: t.Optional(t.Number({ minimum: 0, description: "Number of passed samples" })),
	failedQty: t.Optional(t.Number({ minimum: 0, description: "Number of failed samples" })),
	remark: t.Optional(t.String()),
});

export const faiQuerySchema = t.Object({
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String()),
	page: t.Optional(t.Number({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
});
