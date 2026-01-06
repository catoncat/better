import {
	AuditEntityType,
	getAllPermissions,
	getEffectiveDataScope,
	type Prisma,
} from "@better-app/db";
import { Elysia, status, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	runAuthorizeSchema,
	runDetailResponseSchema,
	runErrorResponseSchema,
	runListQuerySchema,
	runResponseSchema,
} from "./schema";
import { authorizeRun, closeRun, getRunDetail, listRuns } from "./service";

export const runModule = new Elysia({
	prefix: "/runs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query, userPermissions }) => {
			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, Permission.RUN_READ)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			let extraWhere: Prisma.RunWhereInput | undefined;
			if (scope.scope !== "ALL") {
				const lineIds =
					scope.scope === "ASSIGNED_LINES"
						? (scope.lineIds ?? [])
						: await db.station
								.findMany({
									where: { id: { in: scope.stationIds ?? [] } },
									select: { lineId: true },
								})
								.then((stations) => [
									...new Set(
										stations
											.map((s) => s.lineId)
											.filter((lineId): lineId is string => Boolean(lineId)),
									),
								]);

				extraWhere = { lineId: { in: lineIds } };
			}

			return listRuns(db, query, extraWhere);
		},
		{
			isAuth: true,
			requirePermission: Permission.RUN_READ,
			query: runListQuerySchema,
			detail: { tags: ["MES - Runs"] },
		},
	)
	.get(
		"/:runNo",
		async ({ db, params }) => {
			const result = await getRunDetail(db, params.runNo);
			if (!result) {
				return status(404, {
					ok: false,
					error: { code: "RUN_NOT_FOUND", message: "Run not found" },
				});
			}
			return result;
		},
		{
			isAuth: true,
			requirePermission: Permission.RUN_READ,
			params: t.Object({ runNo: t.String() }),
			response: {
				200: runDetailResponseSchema,
				404: runErrorResponseSchema,
			},
			detail: { tags: ["MES - Runs"] },
		},
	)
	.post(
		"/:runNo/authorize",
		async ({ db, params, body, set, user, request, userPermissions }) => {
			if (!userPermissions) {
				set.status = 403;
				return { ok: false, error: { code: "FORBIDDEN", message: "Not authorized" } };
			}

			const requiredPermission =
				body.action === "AUTHORIZE" ? Permission.RUN_AUTHORIZE : Permission.RUN_REVOKE;
			const userPerms = new Set(getAllPermissions(userPermissions));
			if (!userPerms.has(requiredPermission)) {
				set.status = 403;
				return {
					ok: false,
					error: {
						code: "FORBIDDEN",
						message: `Missing required permission: ${requiredPermission}`,
					},
				};
			}

			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.run.findUnique({ where: { runNo: params.runNo } });
			const result = await authorizeRun(db, params.runNo, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: String(before?.id ?? params.runNo),
					entityDisplay: String(params.runNo),
					action: body.action === "AUTHORIZE" ? "RUN_AUTHORIZE" : "RUN_REVOKE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.runNo),
				action: body.action === "AUTHORIZE" ? "RUN_AUTHORIZE" : "RUN_REVOKE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			loadAbility: true,
			params: t.Object({ runNo: t.String() }),
			body: runAuthorizeSchema,
			response: {
				200: runResponseSchema,
				400: runErrorResponseSchema,
				404: runErrorResponseSchema,
			},
			detail: { tags: ["MES - Runs"] },
		},
	)
	.post(
		"/:runNo/close",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.run.findUnique({ where: { runNo: params.runNo } });

			const result = await closeRun(db, params.runNo, { closedBy: user?.id });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: String(before?.id ?? params.runNo),
					entityDisplay: String(params.runNo),
					action: "RUN_CLOSE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.runNo),
				action: "RUN_CLOSE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.RUN_CLOSE,
			params: t.Object({ runNo: t.String() }),
			response: {
				200: runResponseSchema,
				400: runErrorResponseSchema,
				404: runErrorResponseSchema,
				409: runErrorResponseSchema,
			},
			detail: { tags: ["MES - Runs"], summary: "Run closeout" },
		},
	);
