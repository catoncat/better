import { t } from "elysia";

export const ingestEventTypeSchema = t.Union([
	t.Literal("AUTO"),
	t.Literal("BATCH"),
	t.Literal("TEST"),
]);

export const ingestEventCreateSchema = t.Object({
	dedupeKey: t.String({ minLength: 1 }),
	sourceSystem: t.String({ minLength: 1 }),
	eventType: ingestEventTypeSchema,
	occurredAt: t.String({ minLength: 1 }),
	runNo: t.Optional(t.String({ minLength: 1 })),
	payload: t.Any(),
	meta: t.Optional(t.Any()),
});

export const ingestEventResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		eventId: t.String(),
		duplicate: t.Boolean(),
		status: t.String(),
	}),
});

export const ingestEventErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
