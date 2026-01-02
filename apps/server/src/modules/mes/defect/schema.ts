import { t } from "elysia";

export const createDefectSchema = t.Object({
	unitSn: t.String({ description: "Unit serial number" }),
	code: t.String({ description: "Defect code" }),
	location: t.Optional(t.String({ description: "Defect location on unit" })),
	qty: t.Optional(t.Number({ minimum: 1, default: 1, description: "Defect quantity" })),
	remark: t.Optional(t.String()),
});

export const assignDispositionSchema = t.Object({
	type: t.Union([t.Literal("REWORK"), t.Literal("SCRAP"), t.Literal("HOLD")], {
		description: "Disposition type",
	}),
	reason: t.Optional(t.String({ description: "Reason for disposition" })),
	// Rework specific fields
	toStepNo: t.Optional(t.Number({ minimum: 1, description: "Step to rework to (for REWORK)" })),
});

export const releaseHoldSchema = t.Object({
	reason: t.String({ description: "Reason for releasing hold" }),
});

export const completeReworkSchema = t.Object({
	remark: t.Optional(t.String()),
});

export const defectQuerySchema = t.Object({
	unitSn: t.Optional(t.String()),
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String()),
	code: t.Optional(t.String()),
	page: t.Optional(t.Number({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
});

export const reworkTaskQuerySchema = t.Object({
	unitSn: t.Optional(t.String()),
	runNo: t.Optional(t.String()),
	status: t.Optional(t.String()),
	page: t.Optional(t.Number({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
});
