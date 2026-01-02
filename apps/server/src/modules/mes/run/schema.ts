import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

export const runAuthorizeSchema = t.Object({
	action: t.String(), // AUTHORIZE or REVOKE
	reason: t.Optional(t.String()),
});

export const runResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.RunPlain,
});

export const runErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});

export const runListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 30 })),
	status: t.Optional(t.String()),
	search: t.Optional(t.String()),
	sort: t.Optional(t.String()),
	woNo: t.Optional(t.String()),
	lineCode: t.Optional(t.String()),
});

export const runDetailResponseSchema = t.Object({
	run: t.Object({
		id: t.String(),
		runNo: t.String(),
		status: t.String(),
		shiftCode: t.Union([t.String(), t.Null()]),
		startedAt: t.Union([t.String(), t.Null()]),
		endedAt: t.Union([t.String(), t.Null()]),
		createdAt: t.String(),
	}),
	workOrder: t.Object({
		woNo: t.String(),
		productCode: t.String(),
		plannedQty: t.Number(),
	}),
	line: t.Union([t.Object({ code: t.String(), name: t.String() }), t.Null()]),
	routeVersion: t.Union([
		t.Object({
			versionNo: t.Number(),
			status: t.String(),
			route: t.Object({ code: t.String(), name: t.String() }),
		}),
		t.Null(),
	]),
	unitStats: t.Object({
		total: t.Number(),
		queued: t.Number(),
		inStation: t.Number(),
		done: t.Number(),
		failed: t.Number(),
	}),
	recentUnits: t.Array(
		t.Object({
			sn: t.String(),
			status: t.String(),
			currentStepNo: t.Number(),
			updatedAt: t.String(),
		}),
	),
});
