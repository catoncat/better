import { t } from "elysia";

const deviceDataItemSchema = t.Object({
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
