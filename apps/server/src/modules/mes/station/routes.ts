import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { stationGroupListResponseSchema, stationListResponseSchema } from "./schema";

export const stationModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/groups",
		async ({ db }) => {
			const items = await db.stationGroup.findMany({
				select: {
					id: true,
					code: true,
					name: true,
				},
				orderBy: [{ code: "asc" }],
			});
			return { items };
		},
		{
			isAuth: true,
			response: stationGroupListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	)
	.get(
		"/",
		async ({ db }) => {
			const items = await db.station.findMany({
				select: {
					id: true,
					code: true,
					name: true,
					stationType: true,
					line: { select: { code: true, name: true } },
				},
				orderBy: [{ code: "asc" }],
			});
			return { items };
		},
		{
			isAuth: true,
			response: stationListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	);
