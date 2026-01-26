import { InspectionStatus } from "@better-app/db";
import { t } from "elysia";

const inspectionStatusPattern = `^(${Object.values(InspectionStatus).join("|")})(,(${Object.values(InspectionStatus).join("|")}))*$`;

export const createFqcSchema = t.Object({
	sampleQty: t.Optional(
		t.Integer({
			minimum: 1,
			default: 1,
			description: "Number of samples to inspect (defaults to 1 for last-piece inspection)",
		}),
	),
	remark: t.Optional(t.String()),
});

export const recordFqcItemSchema = t.Object({
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

export const completeFqcSchema = t.Object({
	decision: t.Union([t.Literal("PASS"), t.Literal("FAIL")], {
		description: "Final FQC decision",
	}),
	passedQty: t.Optional(t.Integer({ minimum: 0, description: "Number of passed samples" })),
	failedQty: t.Optional(t.Integer({ minimum: 0, description: "Number of failed samples" })),
	remark: t.Optional(t.String()),
});

export const fqcQuerySchema = t.Object({
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String({ pattern: inspectionStatusPattern })),
	page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export const signFqcSchema = t.Object({
	remark: t.Optional(t.String({ description: "Optional signature remark" })),
});
