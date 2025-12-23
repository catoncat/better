import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { runAuthorizeSchema, runListQuerySchema, runResponseSchema } from "./schema";
import { authorizeRun, listRuns } from "./service";

export const runModule = new Elysia({
	prefix: "/runs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			return listRuns(db, query);
		},
		{
			isAuth: true,
			query: runListQuerySchema,
			detail: { tags: ["MES - Runs"] },
		},
	)
	.post(
		"/:runNo/authorize",
		async ({ db, params, body, set }) => {
			const result = await authorizeRun(db, params.runNo, body);
			if (!result.success) {
				set.status = result.code === "NOT_FOUND" ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ runNo: t.String() }),
			body: runAuthorizeSchema,
			response: runResponseSchema,
			detail: { tags: ["MES - Runs"] },
		},
	);
