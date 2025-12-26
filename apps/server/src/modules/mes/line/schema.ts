import { t } from "elysia";

export const lineListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(
			t.Object({
				id: t.String(),
				code: t.String(),
				name: t.String(),
			}),
		),
	}),
});
