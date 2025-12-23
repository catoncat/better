import { t } from "elysia";

const stationLineSchema = t.Object({
	code: t.String(),
	name: t.String(),
});

export const stationListResponseSchema = t.Object({
	items: t.Array(
		t.Object({
			code: t.String(),
			name: t.String(),
			stationType: t.String(),
			line: t.Union([stationLineSchema, t.Null()]),
		}),
	),
});
