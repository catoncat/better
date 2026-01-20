import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	bakeRecordCreateSchema,
	bakeRecordListQuerySchema,
	bakeRecordListResponseSchema,
	bakeRecordResponseSchema,
} from "./schema";
import { createBakeRecord, listBakeRecords } from "./service";

export const bakeRecordRoutes = new Elysia({ prefix: "/bake-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listBakeRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: bakeRecordListQuerySchema,
			response: {
				200: bakeRecordListResponseSchema,
			},
			detail: { tags: ["MES - Bake"], summary: "List bake records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createBakeRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.BAKE_RECORD,
					entityId: body.runNo ?? body.itemCode,
					entityDisplay: `Bake record for ${body.itemCode}`,
					action: "BAKE_RECORD_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.BAKE_RECORD,
				entityId: result.data.id,
				entityDisplay: `Bake record for ${result.data.itemCode}`,
				action: "BAKE_RECORD_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: bakeRecordCreateSchema,
			response: {
				201: bakeRecordResponseSchema,
			},
			detail: { tags: ["MES - Bake"], summary: "Create bake record" },
		},
	);
