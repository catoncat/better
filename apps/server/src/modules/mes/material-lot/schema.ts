import { t } from "elysia";

export const materialLotIdParamSchema = t.Object({
	id: t.String(),
});

export const materialLotListQuerySchema = t.Object({
	materialCode: t.Optional(t.String()),
	lotNo: t.Optional(t.String()),
	supplier: t.Optional(t.String()),
	iqcResult: t.Optional(t.String()),
	hasIqc: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
	materialKnown: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
	createdAfter: t.Optional(t.String()),
	createdBefore: t.Optional(t.String()),
	offset: t.Optional(t.String()),
	limit: t.Optional(t.String()),
	sortBy: t.Optional(t.String()),
	sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const materialLotUpdateBodySchema = t.Object({
	supplier: t.Optional(t.Union([t.String(), t.Null()])),
	iqcResult: t.Optional(t.Union([t.String(), t.Null()])),
	iqcDate: t.Optional(t.Union([t.String(), t.Null()])),
});

const materialLotSchema = t.Object({
	id: t.String(),
	materialCode: t.String(),
	lotNo: t.String(),
	supplier: t.Union([t.String(), t.Null()]),
	iqcResult: t.Union([t.String(), t.Null()]),
	iqcDate: t.Union([t.String(), t.Null()]),
	createdAt: t.String(),
	updatedAt: t.String(),
	// 关联信息
	materialName: t.Optional(t.Union([t.String(), t.Null()])),
	materialKnown: t.Boolean(),
});

export const materialLotListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(materialLotSchema),
		total: t.Number(),
		offset: t.Number(),
		limit: t.Number(),
	}),
});

export const materialLotResponseSchema = t.Object({
	ok: t.Boolean(),
	data: materialLotSchema,
});

const usageRecordSchema = t.Object({
	type: t.Union([t.Literal("loading"), t.Literal("bake")]),
	id: t.String(),
	runNo: t.Union([t.String(), t.Null()]),
	slotCode: t.Optional(t.Union([t.String(), t.Null()])),
	createdAt: t.String(),
	operator: t.Union([t.String(), t.Null()]),
});

export const materialLotUsageResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(usageRecordSchema),
	}),
});
