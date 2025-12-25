import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { traceModeQuerySchema, traceUnitResponseSchema } from "./schema";
import { getUnitTrace } from "./service";

export const traceModule = new Elysia({
	prefix: "/trace",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/units/:sn",
		async ({ db, params, query, set }) => {
			const mode = query.mode ?? "run";
			const result = await getUnitTrace(db, params.sn, mode);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ sn: t.String() }),
			query: traceModeQuerySchema,
			response: traceUnitResponseSchema,
			detail: { tags: ["MES - Trace"] },
		},
	);
