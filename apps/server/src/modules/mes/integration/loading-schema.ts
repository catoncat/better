import { t } from "elysia";

// ==========================================
// Stencil Status Schemas
// ==========================================

export const stencilStatusReceiveSchema = t.Object({
	eventId: t.String({ minLength: 1 }),
	eventTime: t.String({ format: "date-time" }),
	stencilId: t.String({ minLength: 1 }),
	version: t.Optional(t.String()),
	status: t.Union([t.Literal("READY"), t.Literal("NOT_READY"), t.Literal("MAINTENANCE")]),
	tensionValue: t.Optional(t.Number()),
	lastCleanedAt: t.Optional(t.String({ format: "date-time" })),
	source: t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]),
	operatorId: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const stencilStatusResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		eventId: t.String(),
		stencilId: t.String(),
		status: t.String(),
		receivedAt: t.String({ format: "date-time" }),
		isDuplicate: t.Boolean(),
	}),
});

// ==========================================
// Solder Paste Status Schemas
// ==========================================

export const solderPasteStatusReceiveSchema = t.Object({
	eventId: t.String({ minLength: 1 }),
	eventTime: t.String({ format: "date-time" }),
	lotId: t.String({ minLength: 1 }),
	status: t.Union([t.Literal("COMPLIANT"), t.Literal("NON_COMPLIANT"), t.Literal("EXPIRED")]),
	expiresAt: t.Optional(t.String({ format: "date-time" })),
	thawedAt: t.Optional(t.String({ format: "date-time" })),
	stirredAt: t.Optional(t.String({ format: "date-time" })),
	source: t.Union([t.Literal("AUTO"), t.Literal("MANUAL")]),
	operatorId: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const solderPasteStatusResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		eventId: t.String(),
		lotId: t.String(),
		status: t.String(),
		receivedAt: t.String({ format: "date-time" }),
		isDuplicate: t.Boolean(),
	}),
});

// ==========================================
// Line Stencil Binding Schemas
// ==========================================

export const lineStencilBindSchema = t.Object({
	stencilId: t.String({ minLength: 1 }),
});

export const lineStencilBindResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		lineId: t.String(),
		stencilId: t.String(),
		isCurrent: t.Boolean(),
		boundAt: t.String({ format: "date-time" }),
		boundBy: t.Union([t.String(), t.Null()]),
	}),
});

export const lineStencilUnbindResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		lineId: t.String(),
		stencilId: t.String(),
		isCurrent: t.Boolean(),
		unboundAt: t.String({ format: "date-time" }),
		unboundBy: t.Union([t.String(), t.Null()]),
	}),
});

// ==========================================
// Line Solder Paste Binding Schemas
// ==========================================

export const lineSolderPasteBindSchema = t.Object({
	lotId: t.String({ minLength: 1 }),
});

export const lineSolderPasteBindResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		lineId: t.String(),
		lotId: t.String(),
		isCurrent: t.Boolean(),
		boundAt: t.String({ format: "date-time" }),
		boundBy: t.Union([t.String(), t.Null()]),
	}),
});

export const lineSolderPasteUnbindResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
		lineId: t.String(),
		lotId: t.String(),
		isCurrent: t.Boolean(),
		unboundAt: t.String({ format: "date-time" }),
		unboundBy: t.Union([t.String(), t.Null()]),
	}),
});
