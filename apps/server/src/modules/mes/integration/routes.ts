import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { integrationReceiveWorkOrderSchema } from "./schema";
import { receiveWorkOrder } from "./service";

export const integrationModule = new Elysia({
	prefix: "/integration",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/work-orders",
		async ({ db, body }) => {
			const wo = await receiveWorkOrder(db, body);
			return { ok: true, data: wo };
		},
		{
			isAuth: true,
			body: integrationReceiveWorkOrderSchema,
			detail: { tags: ["MES - Integration"] },
		},
	);