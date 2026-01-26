import { t } from "elysia";

export const mesEventStatusSchema = t.Union([
	t.Literal("PENDING"),
	t.Literal("PROCESSING"),
	t.Literal("COMPLETED"),
	t.Literal("FAILED"),
]);

export const outboundRunCompletionEnqueueResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		eventId: t.String(),
		idempotencyKey: t.String(),
	}),
});

export const outboundEventListQuerySchema = t.Object({
	status: t.Optional(mesEventStatusSchema),
	limit: t.Optional(t.Numeric()),
});

export const outboundEventListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(
			t.Object({
				id: t.String(),
				eventType: t.String(),
				status: mesEventStatusSchema,
				attempts: t.Number(),
				maxAttempts: t.Number(),
				nextAttemptAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
				processedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
				occurredAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
				idempotencyKey: t.Union([t.String(), t.Null()]),
				errorMessage: t.Union([t.String(), t.Null()]),
				payload: t.Union([t.Any(), t.Null()]),
			}),
		),
	}),
});

export const outboundEventRetryResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		eventId: t.String(),
		status: mesEventStatusSchema,
		nextAttemptAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	}),
});

