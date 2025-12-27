import { Elysia, status, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { traceErrorResponseSchema, traceModeQuerySchema, traceUnitResponseSchema } from "./schema";
import { getUnitTrace } from "./service";

export const traceModule = new Elysia({
	prefix: "/trace",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/units/:sn",
		async ({ db, params, query }) => {
			const mode = query.mode ?? "run";
			const result = await getUnitTrace(db, params.sn, mode);
			if (!result.success) {
				if (result.status === 404) {
					return status(404, {
						ok: false,
						error: { code: result.code, message: result.message },
					});
				}
				return status(400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.TRACE_READ,
			params: t.Object({ sn: t.String() }),
			query: traceModeQuerySchema,
			response: {
				200: traceUnitResponseSchema,
				400: traceErrorResponseSchema,
				404: traceErrorResponseSchema,
			},
			detail: { tags: ["MES - Trace"] },
		},
	);
