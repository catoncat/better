import { t } from "elysia";

export const dataCollectionSpecIdParamsSchema = t.Object({
	specId: t.String(),
});

export const dataCollectionItemTypeSchema = t.Union([t.Literal("KEY"), t.Literal("OBSERVATION")]);

export const dataCollectionDataTypeSchema = t.Union([
	t.Literal("NUMBER"),
	t.Literal("TEXT"),
	t.Literal("BOOLEAN"),
	t.Literal("JSON"),
]);

export const dataCollectionMethodSchema = t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]);

export const dataCollectionTriggerTypeSchema = t.Union([
	t.Literal("EVENT"),
	t.Literal("TIME"),
	t.Literal("EACH_UNIT"),
	t.Literal("EACH_CARRIER"),
]);

const nullableJsonSchema = t.Union([t.Any(), t.Null()]);

export const dataCollectionSpecSchema = t.Object({
	id: t.String(),
	operationId: t.String(),
	operationCode: t.String(),
	operationName: t.String(),
	name: t.String(),
	itemType: dataCollectionItemTypeSchema,
	dataType: dataCollectionDataTypeSchema,
	method: dataCollectionMethodSchema,
	triggerType: dataCollectionTriggerTypeSchema,
	triggerRule: nullableJsonSchema,
	spec: nullableJsonSchema,
	alarm: nullableJsonSchema,
	isRequired: t.Boolean(),
	isActive: t.Boolean(),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const dataCollectionSpecCreateSchema = t.Object({
	operationCode: t.String({ minLength: 1 }),
	name: t.String({ minLength: 1 }),
	itemType: dataCollectionItemTypeSchema,
	dataType: dataCollectionDataTypeSchema,
	method: dataCollectionMethodSchema,
	triggerType: dataCollectionTriggerTypeSchema,
	triggerRule: t.Optional(nullableJsonSchema),
	spec: t.Optional(nullableJsonSchema),
	alarm: t.Optional(nullableJsonSchema),
	isRequired: t.Optional(t.Boolean({ default: false })),
	isActive: t.Optional(t.Boolean({ default: true })),
});

export const dataCollectionSpecUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	itemType: t.Optional(dataCollectionItemTypeSchema),
	dataType: t.Optional(dataCollectionDataTypeSchema),
	method: t.Optional(dataCollectionMethodSchema),
	triggerType: t.Optional(dataCollectionTriggerTypeSchema),
	triggerRule: t.Optional(nullableJsonSchema),
	spec: t.Optional(nullableJsonSchema),
	alarm: t.Optional(nullableJsonSchema),
	isRequired: t.Optional(t.Boolean()),
	isActive: t.Optional(t.Boolean()),
});

export const dataCollectionSpecListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
	operationCode: t.Optional(t.String()),
	name: t.Optional(t.String()),
	isActive: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
	sortBy: t.Optional(t.Union([t.Literal("updatedAt"), t.Literal("name"), t.Literal("createdAt")])),
	sortDir: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const dataCollectionSpecListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(dataCollectionSpecSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const dataCollectionSpecResponseSchema = t.Object({
	ok: t.Boolean(),
	data: dataCollectionSpecSchema,
});

export const dataCollectionSpecErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
