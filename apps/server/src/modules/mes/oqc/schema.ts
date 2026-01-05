import { t } from "elysia";

// ==========================================
// OQC Sampling Rule Schemas
// ==========================================

export const createSamplingRuleSchema = t.Object({
	productCode: t.Optional(t.String()),
	lineId: t.Optional(t.String()),
	routingId: t.Optional(t.String()),
	samplingType: t.Union([t.Literal("PERCENTAGE"), t.Literal("FIXED")]),
	sampleValue: t.Number({ minimum: 0 }),
	priority: t.Optional(t.Integer({ default: 0 })),
	isActive: t.Optional(t.Boolean({ default: true })),
	meta: t.Optional(t.Any()),
});

export const updateSamplingRuleSchema = t.Object({
	productCode: t.Optional(t.Union([t.String(), t.Null()])),
	lineId: t.Optional(t.Union([t.String(), t.Null()])),
	routingId: t.Optional(t.Union([t.String(), t.Null()])),
	samplingType: t.Optional(t.Union([t.Literal("PERCENTAGE"), t.Literal("FIXED")])),
	sampleValue: t.Optional(t.Number({ minimum: 0 })),
	priority: t.Optional(t.Integer()),
	isActive: t.Optional(t.Boolean()),
	meta: t.Optional(t.Any()),
});

export const samplingRuleQuerySchema = t.Object({
	productCode: t.Optional(t.String()),
	lineId: t.Optional(t.String()),
	routingId: t.Optional(t.String()),
	isActive: t.Optional(t.String()), // "true" or "false"
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

// ==========================================
// OQC Task Schemas
// ==========================================

export const createOqcSchema = t.Object({
	sampleQty: t.Optional(t.Integer({ minimum: 1 })), // Override calculated sample size
	remark: t.Optional(t.String()),
});

export const recordOqcItemSchema = t.Object({
	unitSn: t.String(),
	itemName: t.String(),
	itemSpec: t.Optional(t.String()),
	actualValue: t.Optional(t.String()),
	result: t.Union([t.Literal("PASS"), t.Literal("FAIL"), t.Literal("NA")]),
	defectCode: t.Optional(t.String()),
	remark: t.Optional(t.String()),
});

export const completeOqcSchema = t.Object({
	decision: t.Union([t.Literal("PASS"), t.Literal("FAIL")]),
	passedQty: t.Optional(t.Integer({ minimum: 0 })),
	failedQty: t.Optional(t.Integer({ minimum: 0 })),
	remark: t.Optional(t.String()),
});

export const oqcQuerySchema = t.Object({
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String()), // comma-separated: PENDING,INSPECTING,PASS,FAIL
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

// ==========================================
// MRB Decision Schemas
// ==========================================

export const mrbDecisionSchema = t.Object({
	decision: t.Union([t.Literal("RELEASE"), t.Literal("REWORK"), t.Literal("SCRAP")]),
	reworkType: t.Optional(t.Union([t.Literal("REUSE_PREP"), t.Literal("FULL_PREP")])),
	faiWaiver: t.Optional(t.Boolean()),
	faiWaiverReason: t.Optional(t.String()),
	reason: t.String({ minLength: 4 }),
});

export const createReworkRunSchema = t.Object({
	reworkType: t.Union([t.Literal("REUSE_PREP"), t.Literal("FULL_PREP")]),
	mrbDecisionId: t.String({ minLength: 1 }),
	faiWaiver: t.Optional(t.Boolean()),
	waiverReason: t.Optional(t.String()),
});
