import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	stationGroupListResponseSchema,
	stationListResponseSchema,
	stationQueueResponseSchema,
} from "./schema";

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
	)
	.get(
		"/:stationCode/queue",
		async ({ db, params }) => {
			const station = await db.station.findUnique({
				where: { code: params.stationCode },
				select: { id: true, code: true, name: true },
			});

			if (!station) {
				return { station: { code: params.stationCode, name: "未知" }, queue: [] };
			}

			const units = await db.unit.findMany({
				where: {
					status: "IN_STATION",
					tracks: {
						some: {
							stationId: station.id,
							outAt: null,
						},
					},
				},
				include: {
					workOrder: { select: { woNo: true } },
					run: { select: { runNo: true } },
					tracks: {
						where: { stationId: station.id, outAt: null },
						orderBy: { inAt: "desc" },
						take: 1,
					},
				},
				orderBy: { updatedAt: "desc" },
				take: 50,
			});

			const queue = units.map((unit) => ({
				sn: unit.sn,
				status: unit.status,
				currentStepNo: unit.currentStepNo,
				woNo: unit.workOrder.woNo,
				runNo: unit.run?.runNo ?? "",
				inAt: unit.tracks[0]?.inAt?.toISOString() ?? null,
			}));

			return { station: { code: station.code, name: station.name }, queue };
		},
		{
			isAuth: true,
			params: t.Object({ stationCode: t.String() }),
			response: stationQueueResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	);
