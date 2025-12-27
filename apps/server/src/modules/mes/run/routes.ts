import { AuditEntityType } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	runAuthorizeSchema,
	runErrorResponseSchema,
	runListQuerySchema,
	runResponseSchema,
} from "./schema";
import { authorizeRun, listRuns } from "./service";

export const runModule = new Elysia({
	prefix: "/runs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			return listRuns(db, query);
		},
		{
			isAuth: true,
			query: runListQuerySchema,
			detail: { tags: ["MES - Runs"] },
		},
	)
	.post(
		"/:runNo/authorize",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.run.findUnique({ where: { runNo: params.runNo } });
			const result = await authorizeRun(db, params.runNo, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: before?.id ?? params.runNo,
					entityDisplay: params.runNo,
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
				entityId: result.data.id,
				entityDisplay: result.data.runNo,
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
			params: t.Object({ runNo: t.String() }),
			body: runAuthorizeSchema,
			response: {
				200: runResponseSchema,
				400: runErrorResponseSchema,
				404: runErrorResponseSchema,
			},
			detail: { tags: ["MES - Runs"] },
		},
	);
