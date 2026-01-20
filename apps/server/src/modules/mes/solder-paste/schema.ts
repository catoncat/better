import { t } from "elysia";

export const solderPasteUsageRecordSchema = t.Object({
	id: t.String(),
	lotId: t.String(),
	lineId: t.Union([t.String(), t.Null()]),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	receivedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	expiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	receivedQty: t.Union([t.Number(), t.Null()]),
	thawedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	issuedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	returnedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	isReturned: t.Union([t.Boolean(), t.Null()]),
	usedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const solderPasteUsageCreateSchema = t.Object({
	lotId: t.String({ minLength: 1 }),
	lineCode: t.Optional(t.String()),
	receivedAt: t.Optional(t.String({ format: "date-time" })),
	expiresAt: t.Optional(t.String({ format: "date-time" })),
	receivedQty: t.Optional(t.Number()),
	thawedAt: t.Optional(t.String({ format: "date-time" })),
	issuedAt: t.Optional(t.String({ format: "date-time" })),
	returnedAt: t.Optional(t.String({ format: "date-time" })),
	isReturned: t.Optional(t.Boolean()),
	usedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const solderPasteUsageListQuerySchema = t.Object({
	lotId: t.Optional(t.String()),
	lineCode: t.Optional(t.String()),
	receivedFrom: t.Optional(t.String({ format: "date-time" })),
	receivedTo: t.Optional(t.String({ format: "date-time" })),
	issuedFrom: t.Optional(t.String({ format: "date-time" })),
	issuedTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const solderPasteUsageListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(solderPasteUsageRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const solderPasteUsageResponseSchema = t.Object({
	ok: t.Boolean(),
	data: solderPasteUsageRecordSchema,
});

export const coldStorageTemperatureRecordSchema = t.Object({
	id: t.String(),
	measuredAt: t.String({ format: "date-time" }),
	temperature: t.Number(),
	measuredBy: t.String(),
	reviewedBy: t.Union([t.String(), t.Null()]),
	remark: t.Union([t.String(), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const coldStorageTemperatureCreateSchema = t.Object({
	measuredAt: t.String({ format: "date-time" }),
	temperature: t.Number(),
	measuredBy: t.String({ minLength: 1 }),
	reviewedBy: t.Optional(t.String()),
	remark: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const coldStorageTemperatureListQuerySchema = t.Object({
	measuredFrom: t.Optional(t.String({ format: "date-time" })),
	measuredTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const coldStorageTemperatureListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(coldStorageTemperatureRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const coldStorageTemperatureResponseSchema = t.Object({
	ok: t.Boolean(),
	data: coldStorageTemperatureRecordSchema,
});
