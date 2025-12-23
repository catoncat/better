import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { runAuthorizeSchema } from "./schema";
import { authorizeRun } from "./service";

export const runModule = new Elysia({
	prefix: "/runs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/:runNo/authorize",
		async ({ db, params, body, set }) => {
			const result = await authorizeRun(db, params.runNo, body);
			if (!result.success) {
				set.status = result.code === "RUN_NOT_FOUND" ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ runNo: t.String() }),
			body: runAuthorizeSchema,
			detail: { tags: ["MES - Runs"] },
		},
	);
