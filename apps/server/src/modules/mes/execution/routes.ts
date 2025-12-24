import { Elysia, t } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { trackInSchema, trackOutSchema, trackResponseSchema } from "./schema";
import { trackIn, trackOut } from "./service";

export const executionModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/:stationCode/track-in",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			const result = await trackIn(db, params.stationCode, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.UNIT,
					entityId: beforeUnit?.id ?? body.sn,
					entityDisplay: body.sn,
					action: "TRACK_IN",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before: beforeUnit,
					request: requestMeta,
					payload: {
						stationCode: params.stationCode,
						runNo: body.runNo,
						woNo: body.woNo,
					},
				});
				set.status =
					result.code === "STATION_NOT_FOUND" ||
					result.code === "RUN_NOT_FOUND" ||
					result.code === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			const afterUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			await recordAuditEvent(db, {
				entityType: AuditEntityType.UNIT,
				entityId: afterUnit?.id ?? body.sn,
				entityDisplay: body.sn,
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
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			const result = await trackOut(db, params.stationCode, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.UNIT,
					entityId: beforeUnit?.id ?? body.sn,
					entityDisplay: body.sn,
					action: "TRACK_OUT",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before: beforeUnit,
					request: requestMeta,
					payload: {
						stationCode: params.stationCode,
						runNo: body.runNo,
						result: body.result,
					},
				});
				set.status =
					result.code === "STATION_NOT_FOUND" ||
					result.code === "RUN_NOT_FOUND" ||
					result.code === "UNIT_NOT_FOUND"
						? 404
						: 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			const afterUnit = await db.unit.findUnique({ where: { sn: body.sn } });
			await recordAuditEvent(db, {
				entityType: AuditEntityType.UNIT,
				entityId: afterUnit?.id ?? body.sn,
				entityDisplay: body.sn,
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
