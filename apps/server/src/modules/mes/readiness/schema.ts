import { t } from "elysia";

export const runNoParamSchema = t.Object({
	runNo: t.String(),
});

export const itemIdParamSchema = t.Object({
	runNo: t.String(),
	itemId: t.String(),
});

export const latestQuerySchema = t.Object({
	type: t.Optional(t.Union([t.Literal("PRECHECK"), t.Literal("FORMAL")])),
});

export const waiveBodySchema = t.Object({
	reason: t.String({ minLength: 1 }),
});

export const checkItemSchema = t.Object({
	id: t.String(),
	itemType: t.String(),
	itemKey: t.String(),
	status: t.String(),
	failReason: t.Optional(t.Union([t.String(), t.Null()])),
	waivedAt: t.Optional(t.Union([t.String(), t.Null()])),
	waivedBy: t.Optional(t.Union([t.String(), t.Null()])),
	waiveReason: t.Optional(t.Union([t.String(), t.Null()])),
});

export const checkSummarySchema = t.Object({
	total: t.Number(),
	passed: t.Number(),
	failed: t.Number(),
	waived: t.Number(),
});

export const checkResultSchema = t.Object({
	checkId: t.String(),
	type: t.String(),
	status: t.String(),
	checkedAt: t.String(),
	checkedBy: t.Optional(t.Union([t.String(), t.Null()])),
	items: t.Array(checkItemSchema),
	summary: checkSummarySchema,
});

export const checkResponseSchema = t.Object({
	ok: t.Boolean(),
	data: checkResultSchema,
});

export const checkHistorySchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		checks: t.Array(
			t.Object({
				checkId: t.String(),
				type: t.String(),
				status: t.String(),
				checkedAt: t.String(),
				checkedBy: t.Optional(t.Union([t.String(), t.Null()])),
			}),
		),
	}),
});

export const errorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});

export const waiveResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		itemId: t.String(),
		status: t.String(),
		waivedAt: t.String(),
		waivedBy: t.String(),
		waiveReason: t.String(),
	}),
});

export const exceptionsQuerySchema = t.Object({
	lineId: t.Optional(t.String()),
	status: t.Optional(t.Union([t.Literal("PREP"), t.Literal("FAI_PENDING"), t.Literal("ALL")])),
	from: t.Optional(t.String()),
	to: t.Optional(t.String()),
	page: t.Optional(t.Numeric({ default: 1 })),
	limit: t.Optional(t.Numeric({ default: 20 })),
});

export const exceptionItemSchema = t.Object({
	runNo: t.String(),
	runStatus: t.String(),
	productCode: t.String(),
	lineCode: t.Union([t.String(), t.Null()]),
	lineName: t.Union([t.String(), t.Null()]),
	checkId: t.String(),
	checkType: t.String(),
	checkStatus: t.String(),
	checkedAt: t.String(),
	failedCount: t.Number(),
	waivedCount: t.Number(),
});

export const exceptionsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(exceptionItemSchema),
		total: t.Number(),
		page: t.Number(),
		limit: t.Number(),
	}),
});
