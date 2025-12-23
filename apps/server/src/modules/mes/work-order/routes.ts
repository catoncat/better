import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { workOrderReleaseSchema, runCreateSchema } from "./schema";
import { createRun, releaseWorkOrder } from "./service";

const notFoundCodes = new Set(["WORK_ORDER_NOT_FOUND", "LINE_NOT_FOUND"]);

export const workOrderModule = new Elysia({
	prefix: "/work-orders",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/:woNo/release",
		async ({ db, params, body, set }) => {
			const result = await releaseWorkOrder(db, params.woNo, body);
			if (!result.success) {
				set.status = notFoundCodes.has(result.code) ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ woNo: t.String() }),
			body: workOrderReleaseSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/runs",
		async ({ db, params, body, set }) => {
			const result = await createRun(db, params.woNo, body);
			if (!result.success) {
				set.status = notFoundCodes.has(result.code) ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ woNo: t.String() }),
			body: runCreateSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	);
