import { t } from "elysia";

export const deviceDataItemSchema = t.Object({
	specId: t.Optional(t.String({ minLength: 1 })),
	specName: t.Optional(t.String({ minLength: 1 })),
	valueNumber: t.Optional(t.Number()),
	valueText: t.Optional(t.String()),
	valueBoolean: t.Optional(t.Boolean()),
	valueJson: t.Optional(t.Any()),
	collectedAt: t.Optional(t.String({ format: "date-time" })),
});

export const deviceDataReceiveSchema = t.Object({
	eventId: t.String({ minLength: 1 }),
	eventTime: t.String({ format: "date-time" }),
	source: t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]),
	runNo: t.Optional(t.String()),
	unitSn: t.Optional(t.String()),
	stationCode: t.Optional(t.String()),
	stepNo: t.Optional(t.Number({ minimum: 1 })),
	trackId: t.Optional(t.String()),
	carrierTrackId: t.Optional(t.String()),
	operationId: t.Optional(t.String()),
	equipmentId: t.Optional(t.String()),
	operatorId: t.Optional(t.String()),
	data: t.Array(deviceDataItemSchema),
	meta: t.Optional(t.Any()),
});

export const deviceDataResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		eventId: t.String(),
		trackId: t.Union([t.String(), t.Null()]),
		carrierTrackId: t.Union([t.String(), t.Null()]),
		dataValuesCreated: t.Number(),
		receivedAt: t.String({ format: "date-time" }),
		isDuplicate: t.Boolean(),
	}),
});

export const deviceDataRecordSchema = t.Object({
	id: t.String(),
	eventId: t.String(),
	eventTime: t.String({ format: "date-time" }),
	source: t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]),
	runNo: t.Union([t.String(), t.Null()]),
	unitSn: t.Union([t.String(), t.Null()]),
	stationCode: t.Union([t.String(), t.Null()]),
	stepNo: t.Union([t.Number(), t.Null()]),
	trackId: t.Union([t.String(), t.Null()]),
	carrierTrackId: t.Union([t.String(), t.Null()]),
	operationId: t.Union([t.String(), t.Null()]),
	equipmentId: t.Union([t.String(), t.Null()]),
	operatorId: t.Union([t.String(), t.Null()]),
	data: t.Array(deviceDataItemSchema),
	meta: t.Union([t.Any(), t.Null()]),
	dataValuesCreated: t.Number(),
	receivedAt: t.String({ format: "date-time" }),
});

export const deviceDataRecordListQuerySchema = t.Object({
	eventId: t.Optional(t.String({ minLength: 1 })),
	runNo: t.Optional(t.String({ minLength: 1 })),
	unitSn: t.Optional(t.String({ minLength: 1 })),
	stationCode: t.Optional(t.String({ minLength: 1 })),
	stepNo: t.Optional(t.Numeric({ minimum: 1 })),
	source: t.Optional(t.Union([t.Literal("AUTO"), t.Literal("MANUAL")])),
	eventFrom: t.Optional(t.String({ format: "date-time" })),
	eventTo: t.Optional(t.String({ format: "date-time" })),
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
});

export const deviceDataRecordListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(deviceDataRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});
