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
			woNo: t.String(),
			runNo: t.String(),
			inAt: t.Union([t.String(), t.Null()]),
		}),
	),
});
