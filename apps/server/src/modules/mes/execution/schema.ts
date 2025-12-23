import { t } from "elysia";

export const trackInSchema = t.Object({
	sn: t.String(),
	woNo: t.String(),
	runNo: t.String(),
});

export const trackOutSchema = t.Object({
	sn: t.String(),
	runNo: t.String(),
	result: t.String(), // PASS or FAIL
	operatorId: t.Optional(t.String()),
	data: t.Optional(
		t.Array(
			t.Object({
				specName: t.String(), // Changed from specCode to match service.ts
				valueNumber: t.Optional(t.Number()),
				valueText: t.Optional(t.String()),
				valueBoolean: t.Optional(t.Boolean()),
				valueJson: t.Optional(t.Any()),
			}),
		),
	),
});

export const trackResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		status: t.String(),
	}),
});