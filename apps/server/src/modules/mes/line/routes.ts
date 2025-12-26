import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { lineListResponseSchema } from "./schema";

export const lineModule = new Elysia({
	prefix: "/lines",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db }) => {
			const items = await db.line.findMany({
				select: {
					id: true,
					code: true,
					name: true,
				},
				orderBy: [{ code: "asc" }],
			});
			return { ok: true, data: { items } };
		},
		{
			isAuth: true,
			response: lineListResponseSchema,
			detail: { tags: ["MES - Lines"] },
		},
	);
