import { t } from "elysia";

// ==========================================
// TimeRuleDefinition Schemas
// ==========================================

export const timeRuleDefinitionSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	description: t.Union([t.String(), t.Null()]),
	ruleType: t.String(),
	durationMinutes: t.Number(),
	warningMinutes: t.Union([t.Number(), t.Null()]),
	startEvent: t.String(),
	endEvent: t.String(),
	scope: t.String(),
	scopeValue: t.Union([t.String(), t.Null()]),
	requiresWashStep: t.Boolean(),
	isWaivable: t.Boolean(),
	isActive: t.Boolean(),
	priority: t.Number(),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const timeRuleDefinitionCreateSchema = t.Object({
	code: t.String({ minLength: 1 }),
	name: t.String({ minLength: 1 }),
	description: t.Optional(t.String()),
	ruleType: t.Union([t.Literal("SOLDER_PASTE_EXPOSURE"), t.Literal("WASH_TIME_LIMIT")]),
	durationMinutes: t.Number({ minimum: 1 }),
	warningMinutes: t.Optional(t.Number({ minimum: 1 })),
	startEvent: t.String({ minLength: 1 }),
	endEvent: t.String({ minLength: 1 }),
	scope: t.Optional(
		t.Union([t.Literal("GLOBAL"), t.Literal("LINE"), t.Literal("ROUTING"), t.Literal("PRODUCT")]),
	),
	scopeValue: t.Optional(t.String()),
	requiresWashStep: t.Optional(t.Boolean()),
	isWaivable: t.Optional(t.Boolean()),
	isActive: t.Optional(t.Boolean()),
	priority: t.Optional(t.Number()),
});

export const timeRuleDefinitionListQuerySchema = t.Object({
	activeOnly: t.Optional(t.BooleanString()),
});

export const timeRuleDefinitionListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Array(timeRuleDefinitionSchema),
});

export const timeRuleDefinitionResponseSchema = t.Object({
	ok: t.Boolean(),
	data: timeRuleDefinitionSchema,
});

// ==========================================
// TimeRuleInstance Schemas
// ==========================================

export const timeRuleInstanceSchema = t.Object({
	id: t.String(),
	definitionId: t.String(),
	definitionCode: t.String(),
	definitionName: t.String(),
	ruleType: t.String(),
	runId: t.Union([t.String(), t.Null()]),
	runNo: t.Union([t.String(), t.Null()]),
	entityType: t.String(),
	entityId: t.String(),
	entityDisplay: t.Union([t.String(), t.Null()]),
	startedAt: t.String({ format: "date-time" }),
	expiresAt: t.String({ format: "date-time" }),
	warningAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	status: t.String(),
	completedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	expiredAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	waivedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	waivedBy: t.Union([t.String(), t.Null()]),
	waiveReason: t.Union([t.String(), t.Null()]),
	remainingMinutes: t.Union([t.Number(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const timeRuleInstanceListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Array(timeRuleInstanceSchema),
});

export const timeRuleInstanceResponseSchema = t.Object({
	ok: t.Boolean(),
	data: timeRuleInstanceSchema,
});

export const timeRuleInstanceWaiveSchema = t.Object({
	waiveReason: t.String({ minLength: 1 }),
});

// ==========================================
// Error Response Schema
// ==========================================

export const timeRuleErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
