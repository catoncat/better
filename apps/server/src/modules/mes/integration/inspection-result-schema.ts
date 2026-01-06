import { t } from "elysia";

// ==========================================
// Defect Item Schema (for FAIL results)
// ==========================================

const defectItemSchema = t.Object({
	code: t.String({ minLength: 1 }),
	location: t.Optional(t.String()),
	description: t.Optional(t.String()),
	qty: t.Optional(t.Number({ minimum: 1 })),
});

// ==========================================
// Inspection Result Receive Schema
// ==========================================

export const inspectionResultReceiveSchema = t.Object({
	eventId: t.String({ minLength: 1 }),
	eventTime: t.String({ format: "date-time" }),
	runNo: t.String({ minLength: 1 }),
	stationCode: t.String({ minLength: 1 }),
	unitSn: t.String({ minLength: 1 }),
	stepNo: t.Number({ minimum: 1 }),
	trackId: t.Optional(t.String()),
	inspectionType: t.Union([t.Literal("SPI"), t.Literal("AOI")]),
	result: t.Union([t.Literal("PASS"), t.Literal("FAIL")]),
	defects: t.Optional(t.Array(defectItemSchema)),
	rawData: t.Optional(t.Any()),
	source: t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]),
	equipmentId: t.Optional(t.String()),
	operatorId: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

// ==========================================
// Inspection Result Response Schema
// ==========================================

export const inspectionResultResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		eventId: t.String(),
		runNo: t.String(),
		unitSn: t.String(),
		inspectionType: t.String(),
		result: t.String(),
		trackId: t.Union([t.String(), t.Null()]),
		defectsCreated: t.Number(),
		receivedAt: t.String({ format: "date-time" }),
		isDuplicate: t.Boolean(),
	}),
});
