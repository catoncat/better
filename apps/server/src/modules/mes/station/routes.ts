import { getAllPermissions, getEffectiveDataScope } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
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
	.use(permissionPlugin)
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
			requirePermission: [
				Permission.ROUTE_READ,
				Permission.ROUTE_CONFIGURE,
				Permission.WO_RELEASE,
				Permission.RUN_CREATE,
			],
			response: stationGroupListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	)
	.get(
		"/",
		async ({ db, userPermissions }) => {
			const permissions = userPermissions ? new Set(getAllPermissions(userPermissions)) : new Set();
			const scopePermission = permissions.has(Permission.EXEC_READ)
				? Permission.EXEC_READ
				: permissions.has(Permission.EXEC_TRACK_IN)
					? Permission.EXEC_TRACK_IN
					: Permission.EXEC_TRACK_OUT;

			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, scopePermission)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			const where =
				scope.scope === "ASSIGNED_LINES"
					? { lineId: { in: scope.lineIds ?? [] } }
					: scope.scope === "ASSIGNED_STATIONS"
						? { id: { in: scope.stationIds ?? [] } }
						: undefined;

			const items = await db.station.findMany({
				where,
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
			requirePermission: [
				Permission.EXEC_READ,
				Permission.EXEC_TRACK_IN,
				Permission.EXEC_TRACK_OUT,
			],
			response: stationListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	)
	.get(
		"/:stationCode/queue",
		async ({ db, params, set, userPermissions }) => {
			const permissions = userPermissions ? new Set(getAllPermissions(userPermissions)) : new Set();
			const scopePermission = permissions.has(Permission.EXEC_READ)
				? Permission.EXEC_READ
				: permissions.has(Permission.EXEC_TRACK_IN)
					? Permission.EXEC_TRACK_IN
					: Permission.EXEC_TRACK_OUT;

			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, scopePermission)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			const station = await db.station.findUnique({
				where: { code: params.stationCode },
				select: { id: true, code: true, name: true, lineId: true },
			});

			if (station && scope.scope === "ASSIGNED_STATIONS") {
				const stationIds = new Set(scope.stationIds ?? []);
				if (!stationIds.has(station.id)) {
					set.status = 403;
					return { station: { code: station.code, name: station.name }, queue: [] };
				}
			}

			if (station && scope.scope === "ASSIGNED_LINES") {
				const lineIds = new Set(scope.lineIds ?? []);
				if (!station.lineId || !lineIds.has(station.lineId)) {
					set.status = 403;
					return { station: { code: station.code, name: station.name }, queue: [] };
				}
			}

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
				sn: String(unit.sn),
				status: String(unit.status),
				currentStepNo: Number(unit.currentStepNo ?? 0),
				woNo: String(unit.workOrder.woNo),
				runNo: unit.run?.runNo ?? "",
				inAt: unit.tracks[0]?.inAt ? new Date(String(unit.tracks[0].inAt)).toISOString() : null,
			}));

			return { station: { code: station.code, name: station.name }, queue };
		},
		{
			isAuth: true,
			requirePermission: [
				Permission.EXEC_READ,
				Permission.EXEC_TRACK_IN,
				Permission.EXEC_TRACK_OUT,
			],
			params: t.Object({ stationCode: t.String() }),
			response: stationQueueResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	);
