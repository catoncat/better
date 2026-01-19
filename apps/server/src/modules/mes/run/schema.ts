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

export const generateUnitsSchema = t.Object({
	quantity: t.Number({ minimum: 1, maximum: 10000 }),
	snPrefix: t.Optional(t.String()),
});

const routeStepMetaSchema = t.Object({
	stepNo: t.Number(),
	operationCode: t.String(),
	operationName: t.Union([t.String(), t.Null()]),
	stationType: t.String(),
	stationGroup: t.Union([t.Object({ code: t.String(), name: t.String() }), t.Null()]),
	stationCodes: t.Array(t.String()),
});

const routeStepProgressSchema = t.Intersect([
	routeStepMetaSchema,
	t.Object({
		completed: t.Number(),
		total: t.Number(),
	}),
]);

export const generateUnitsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		generated: t.Number(),
		units: t.Array(t.Object({ sn: t.String(), status: t.String() })),
	}),
});

export const deleteUnitsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		deleted: t.Number(),
	}),
});

export const runUnitListQuerySchema = t.Object({
	status: t.Optional(t.String()),
	stationCode: t.Optional(t.String()),
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 50 })),
});

export const runUnitListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		run: t.Object({
			runNo: t.String(),
			status: t.String(),
		}),
		workOrder: t.Object({
			woNo: t.String(),
			productCode: t.String(),
		}),
		items: t.Array(
			t.Object({
				sn: t.String(),
				status: t.String(),
				currentStepNo: t.Number(),
				updatedAt: t.String(),
				currentStep: t.Union([routeStepMetaSchema, t.Null()]),
				nextStep: t.Union([routeStepMetaSchema, t.Null()]),
			}),
		),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const runDetailResponseSchema = t.Object({
	run: t.Object({
		id: t.String(),
		runNo: t.String(),
		status: t.String(),
		planQty: t.Number(),
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
	routeSteps: t.Array(routeStepProgressSchema),
	unitStats: t.Object({
		total: t.Number(),
		queued: t.Number(),
		inStation: t.Number(),
		done: t.Number(),
		failed: t.Number(),
	}),
	faiTrial: t.Union(
		[
			t.Object({
				status: t.String(),
				sampleQty: t.Number(),
				trackedQty: t.Number(),
			}),
			t.Null(),
		],
		{ default: null },
	),
	recentUnits: t.Array(
		t.Object({
			sn: t.String(),
			status: t.String(),
			currentStepNo: t.Number(),
			updatedAt: t.String(),
		}),
	),
});
