import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { runResponseSchema } from "../run/schema";
import {
	runCreateSchema,
	workOrderListQuerySchema,
	workOrderReleaseSchema,
	workOrderResponseSchema,
} from "./schema";
import { createRun, listWorkOrders, releaseWorkOrder } from "./service";

const notFoundCodes = new Set(["WORK_ORDER_NOT_FOUND", "LINE_NOT_FOUND"]);

export const workOrderModule = new Elysia({
	prefix: "/work-orders",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			return listWorkOrders(db, query);
		},
		{
			isAuth: true,
			query: workOrderListQuerySchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/release",
		async ({ db, params: { woNo }, body, set }) => {
			const result = await releaseWorkOrder(db, woNo, body);
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
			response: workOrderResponseSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/runs",
		async ({ db, params: { woNo }, body, set }) => {
			const result = await createRun(db, woNo, body);
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
			response: runResponseSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	);
