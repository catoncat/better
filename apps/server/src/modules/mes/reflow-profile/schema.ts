import { t } from "elysia";

// ==========================================
// ReflowProfile Schemas
// ==========================================

export const reflowProfileStatusSchema = t.Union([
	t.Literal("ACTIVE"),
	t.Literal("DEPRECATED"),
	t.Literal("ARCHIVED"),
]);

export const reflowProfileSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	version: t.String(),
	description: t.Union([t.String(), t.Null()]),
	status: reflowProfileStatusSchema,
	zoneConfig: t.Union([t.Any(), t.Null()]),
	peakTempMin: t.Union([t.Number(), t.Null()]),
	peakTempMax: t.Union([t.Number(), t.Null()]),
	totalTimeMin: t.Union([t.Number(), t.Null()]),
	totalTimeMax: t.Union([t.Number(), t.Null()]),
	meta: t.Union([t.Any(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const reflowProfileCreateSchema = t.Object({
	code: t.String({ minLength: 1 }),
	name: t.String({ minLength: 1 }),
	version: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(reflowProfileStatusSchema),
	zoneConfig: t.Optional(t.Any()),
	peakTempMin: t.Optional(t.Number()),
	peakTempMax: t.Optional(t.Number()),
	totalTimeMin: t.Optional(t.Number()),
	totalTimeMax: t.Optional(t.Number()),
	meta: t.Optional(t.Any()),
});

export const reflowProfileUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	version: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(reflowProfileStatusSchema),
	zoneConfig: t.Optional(t.Any()),
	peakTempMin: t.Optional(t.Number()),
	peakTempMax: t.Optional(t.Number()),
	totalTimeMin: t.Optional(t.Number()),
	totalTimeMax: t.Optional(t.Number()),
	meta: t.Optional(t.Any()),
});

export const reflowProfileListQuerySchema = t.Object({
	status: t.Optional(reflowProfileStatusSchema),
	search: t.Optional(t.String()),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const reflowProfileListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(reflowProfileSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const reflowProfileResponseSchema = t.Object({
	ok: t.Boolean(),
	data: reflowProfileSchema,
});

// ==========================================
// ReflowProfileUsage Schemas
// ==========================================

export const reflowProfileUsageSchema = t.Object({
	id: t.String(),
	profileId: t.String(),
	profileCode: t.Union([t.String(), t.Null()]),
	profileName: t.Union([t.String(), t.Null()]),
	runId: t.Union([t.String(), t.Null()]),
	lineId: t.Union([t.String(), t.Null()]),
	equipmentId: t.Union([t.String(), t.Null()]),
	actualProgramName: t.String(),
	actualPeakTemp: t.Union([t.Number(), t.Null()]),
	actualTotalTime: t.Union([t.Number(), t.Null()]),
	isMatched: t.Boolean(),
	mismatchReason: t.Union([t.String(), t.Null()]),
	usedAt: t.String({ format: "date-time" }),
	usedBy: t.Union([t.String(), t.Null()]),
	verifiedBy: t.Union([t.String(), t.Null()]),
	verifiedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	meta: t.Union([t.Any(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const reflowProfileUsageCreateSchema = t.Object({
	profileId: t.String({ minLength: 1 }),
	runId: t.Optional(t.String()),
	lineId: t.Optional(t.String()),
	equipmentId: t.Optional(t.String()),
	actualProgramName: t.String({ minLength: 1 }),
	actualPeakTemp: t.Optional(t.Number()),
	actualTotalTime: t.Optional(t.Number()),
	usedAt: t.Optional(t.String({ format: "date-time" })),
	usedBy: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const reflowProfileUsageListQuerySchema = t.Object({
	profileId: t.Optional(t.String()),
	runId: t.Optional(t.String()),
	lineId: t.Optional(t.String()),
	isMatched: t.Optional(t.BooleanString()),
	usedFrom: t.Optional(t.String({ format: "date-time" })),
	usedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const reflowProfileUsageListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(reflowProfileUsageSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const reflowProfileUsageResponseSchema = t.Object({
	ok: t.Boolean(),
	data: reflowProfileUsageSchema,
});

// ==========================================
// Verification Schema
// ==========================================

export const verifyProfileSchema = t.Object({
	profileId: t.String({ minLength: 1 }),
	actualProgramName: t.String({ minLength: 1 }),
});

export const verifyProfileResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		isMatched: t.Boolean(),
		expectedCode: t.String(),
		actualProgramName: t.String(),
		mismatchReason: t.Union([t.String(), t.Null()]),
	}),
});
