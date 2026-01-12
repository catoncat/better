import { t } from "elysia";

export const operationIdParamsSchema = t.Object({
	operationId: t.String(),
});

export const stationTypeSchema = t.Union([
	t.Literal("MANUAL"),
	t.Literal("AUTO"),
	t.Literal("BATCH"),
	t.Literal("TEST"),
]);

export const operationSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	defaultType: stationTypeSchema,
	isKeyQuality: t.Boolean(),
	meta: t.Union([t.Any(), t.Null()]),
	source: t.Union([t.Literal("ERP"), t.Literal("MES"), t.Literal("SEED")]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const operationCreateSchema = t.Object({
	code: t.String({ minLength: 1, maxLength: 50 }),
	name: t.String({ minLength: 1, maxLength: 100 }),
	defaultType: stationTypeSchema,
	isKeyQuality: t.Optional(t.Boolean({ default: false })),
	meta: t.Optional(t.Union([t.Any(), t.Null()])),
});

export const operationUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
	defaultType: t.Optional(stationTypeSchema),
	isKeyQuality: t.Optional(t.Boolean()),
	meta: t.Optional(t.Union([t.Any(), t.Null()])),
});

export const operationListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
	code: t.Optional(t.String()),
	name: t.Optional(t.String()),
	source: t.Optional(t.Union([t.Literal("ERP"), t.Literal("MES"), t.Literal("SEED")])),
	defaultType: t.Optional(stationTypeSchema),
	sortBy: t.Optional(
		t.Union([t.Literal("updatedAt"), t.Literal("code"), t.Literal("name"), t.Literal("createdAt")]),
	),
	sortDir: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const operationListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(operationSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const operationResponseSchema = t.Object({
	ok: t.Boolean(),
	data: operationSchema,
});

export const operationErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
