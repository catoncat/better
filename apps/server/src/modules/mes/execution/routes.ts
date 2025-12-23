import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { trackInSchema, trackOutSchema, trackResponseSchema } from "./schema";
import { trackIn, trackOut } from "./service";

export const executionModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/:stationCode/track-in",
		async ({ db, params, body, set }) => {
			const result = await trackIn(db, params.stationCode, body);
			if (!result.success) {
				set.status =
					result.code === "STATION_NOT_FOUND" ||
					result.code === "RUN_NOT_FOUND" ||
					result.code === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: { status: result.data?.status as string } };
		},
		{
			isAuth: true,
			params: t.Object({ stationCode: t.String() }),
			body: trackInSchema,
			response: {
				200: trackResponseSchema,
				400: t.Object({ ok: t.Boolean(), error: t.Object({ code: t.String(), message: t.String() }) }),
				404: t.Object({ ok: t.Boolean(), error: t.Object({ code: t.String(), message: t.String() }) }),
			},
			detail: { tags: ["MES - Execution"] },
		},
	)
	.post(
		"/:stationCode/track-out",
		async ({ db, params, body, set }) => {
			const result = await trackOut(db, params.stationCode, body);
			if (!result.success) {
				set.status =
					result.code === "STATION_NOT_FOUND" ||
					result.code === "RUN_NOT_FOUND" ||
					result.code === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: { status: result.data?.status as string } };
		},
		{
			isAuth: true,
			params: t.Object({ stationCode: t.String() }),
			body: trackOutSchema,
			response: {
				200: trackResponseSchema,
				400: t.Object({ ok: t.Boolean(), error: t.Object({ code: t.String(), message: t.String() }) }),
				404: t.Object({ ok: t.Boolean(), error: t.Object({ code: t.String(), message: t.String() }) }),
			},
			detail: { tags: ["MES - Execution"] },
		},
	);
