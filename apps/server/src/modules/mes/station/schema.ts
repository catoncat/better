import { t } from "elysia";

const stationLineSchema = t.Object({
	code: t.String(),
	name: t.String(),
});

export const stationListResponseSchema = t.Object({
	items: t.Array(
		t.Object({
			id: t.String(),
			code: t.String(),
			name: t.String(),
			stationType: t.String(),
			line: t.Union([stationLineSchema, t.Null()]),
		}),
	),
});

export const stationGroupListResponseSchema = t.Object({
	items: t.Array(
		t.Object({
			id: t.String(),
			code: t.String(),
			name: t.String(),
		}),
	),
});

const queueStepSchema = t.Object({
	stepNo: t.Number(),
	operationCode: t.String(),
	operationName: t.Union([t.String(), t.Null()]),
	stationType: t.String(),
	stationGroup: t.Union([t.Object({ code: t.String(), name: t.String() }), t.Null()]),
	stationCodes: t.Array(t.String()),
});

export const stationQueueResponseSchema = t.Object({
	station: t.Object({
		code: t.String(),
		name: t.String(),
	}),
	queue: t.Array(
		t.Object({
			sn: t.String(),
			status: t.String(),
			currentStepNo: t.Number(),
			currentStep: t.Union([queueStepSchema, t.Null()]),
			nextStep: t.Union([queueStepSchema, t.Null()]),
			woNo: t.String(),
			runNo: t.String(),
			inAt: t.Union([t.String(), t.Null()]),
		}),
	),
});
