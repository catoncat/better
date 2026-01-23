import { t } from "elysia";

export const bakeRecordSchema = t.Object({
	id: t.String(),
	runId: t.Union([t.String(), t.Null()]),
	runNo: t.Union([t.String(), t.Null()]),
	routingStepId: t.Union([t.String(), t.Null()]),
	materialLotId: t.Union([t.String(), t.Null()]),
	materialCode: t.Union([t.String(), t.Null()]),
	lotNo: t.Union([t.String(), t.Null()]),
	itemCode: t.String(),
	bakeProcess: t.String(),
	bakeQty: t.String(),
	bakeTemperature: t.Union([t.Number(), t.Null()]),
	durationHours: t.Union([t.String(), t.Null()]),
	inAt: t.String({ format: "date-time" }),
	inBy: t.String(),
	outAt: t.String({ format: "date-time" }),
	outBy: t.String(),
	confirmedBy: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const bakeRecordCreateSchema = t.Object({
	runNo: t.Optional(t.String()),
	routingStepId: t.Optional(t.String()),
	materialCode: t.Optional(t.String()),
	lotNo: t.Optional(t.String()),
	itemCode: t.String({ minLength: 1 }),
	bakeProcess: t.String({ minLength: 1 }),
	bakeQty: t.String({ minLength: 1 }),
	bakeTemperature: t.Optional(t.Number()),
	durationHours: t.Optional(t.String()),
	inAt: t.String({ format: "date-time" }),
	inBy: t.String({ minLength: 1 }),
	outAt: t.String({ format: "date-time" }),
	outBy: t.String({ minLength: 1 }),
	confirmedBy: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const bakeRecordListQuerySchema = t.Object({
	runNo: t.Optional(t.String()),
	itemCode: t.Optional(t.String()),
	bakeProcess: t.Optional(t.String()),
	materialCode: t.Optional(t.String()),
	lotNo: t.Optional(t.String()),
	inFrom: t.Optional(t.String({ format: "date-time" })),
	inTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const bakeRecordListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(bakeRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const bakeRecordResponseSchema = t.Object({
	ok: t.Boolean(),
	data: bakeRecordSchema,
});
