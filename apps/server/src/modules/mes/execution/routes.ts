import { AuditEntityType } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	resolveUnitResponseSchema,
	trackInSchema,
	trackOutSchema,
	trackResponseSchema,
} from "./schema";
import { trackIn, trackOut } from "./service";

export const executionModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/resolve-unit/:sn",
		async ({ db, params, set }) => {
			const unit = await db.unit.findUnique({
				where: { sn: params.sn },
				include: {
					workOrder: { select: { woNo: true } },
					run: { select: { runNo: true } },
				},
			});

			if (!unit) {
				set.status = 404;
				return { ok: false, error: { code: "UNIT_NOT_FOUND", message: "Unit not found" } };
			}

			return {
				ok: true,
				data: { sn: unit.sn, woNo: unit.workOrder.woNo, runNo: unit.run?.runNo ?? null },
			};
		},
		{
			isAuth: true,
			requirePermission: [Permission.EXEC_TRACK_IN, Permission.EXEC_TRACK_OUT],
			params: t.Object({ sn: t.String() }),
			response: {
				200: resolveUnitResponseSchema,
				404: t.Object({
					ok: t.Boolean(),
					error: t.Object({ code: t.String(), message: t.String() }),
				}),
			},
			detail: { tags: ["MES - Execution"] },
		},
	)
	.post(
		"/:stationCode/track-in",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			const result = await trackIn(db, params.stationCode, body);
			if (!result.success) {
				const errorCode = result.code ?? "EXECUTION_ERROR";
				const errorMessage = result.message ?? "Track in failed";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.UNIT,
					entityId: String(beforeUnit?.id ?? body.sn),
					entityDisplay: String(body.sn),
					action: "TRACK_IN",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					before: beforeUnit,
					request: requestMeta,
					payload: {
						stationCode: params.stationCode,
						runNo: body.runNo,
						woNo: body.woNo,
					},
				});
				set.status =
					errorCode === "STATION_NOT_FOUND" ||
					errorCode === "RUN_NOT_FOUND" ||
					errorCode === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}
			const afterUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			await recordAuditEvent(db, {
				entityType: AuditEntityType.UNIT,
				entityId: String(afterUnit?.id ?? body.sn),
				entityDisplay: String(body.sn),
				action: "TRACK_IN",
				actor,
				status: "SUCCESS",
				before: beforeUnit,
				after: afterUnit,
				request: requestMeta,
				payload: {
					stationCode: params.stationCode,
					runNo: body.runNo,
					woNo: body.woNo,
				},
			});
			return { ok: true, data: { status: result.data?.status as string } };
		},
		{
			isAuth: true,
			requirePermission: Permission.EXEC_TRACK_IN,
			params: t.Object({ stationCode: t.String() }),
			body: trackInSchema,
			response: {
				200: trackResponseSchema,
				400: t.Object({
					ok: t.Boolean(),
					error: t.Object({ code: t.String(), message: t.String() }),
				}),
				404: t.Object({
					ok: t.Boolean(),
					error: t.Object({ code: t.String(), message: t.String() }),
				}),
			},
			detail: { tags: ["MES - Execution"] },
		},
	)
	.post(
		"/:stationCode/track-out",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			const result = await trackOut(db, params.stationCode, body);
			if (!result.success) {
				const errorCode = result.code ?? "EXECUTION_ERROR";
				const errorMessage = result.message ?? "Track out failed";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.UNIT,
					entityId: String(beforeUnit?.id ?? body.sn),
					entityDisplay: String(body.sn),
					action: "TRACK_OUT",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					before: beforeUnit,
					request: requestMeta,
					payload: {
						stationCode: params.stationCode,
						runNo: body.runNo,
						result: body.result,
					},
				});
				set.status =
					errorCode === "STATION_NOT_FOUND" ||
					errorCode === "RUN_NOT_FOUND" ||
					errorCode === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}
			const afterUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			await recordAuditEvent(db, {
				entityType: AuditEntityType.UNIT,
				entityId: String(afterUnit?.id ?? body.sn),
				entityDisplay: String(body.sn),
				action: "TRACK_OUT",
				actor,
				status: "SUCCESS",
				before: beforeUnit,
				after: afterUnit,
				request: requestMeta,
				payload: {
					stationCode: params.stationCode,
					runNo: body.runNo,
					result: body.result,
				},
			});
			return { ok: true, data: { status: result.data?.status as string } };
		},
		{
			isAuth: true,
			requirePermission: Permission.EXEC_TRACK_OUT,
			params: t.Object({ stationCode: t.String() }),
			body: trackOutSchema,
			response: {
				200: trackResponseSchema,
				400: t.Object({
					ok: t.Boolean(),
					error: t.Object({ code: t.String(), message: t.String() }),
				}),
				404: t.Object({
					ok: t.Boolean(),
					error: t.Object({ code: t.String(), message: t.String() }),
				}),
			},
			detail: { tags: ["MES - Execution"] },
		},
	);
