import { AuditEntityType } from "@better-app/db";
import { Elysia, error } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { ingestEventCreateSchema, ingestEventErrorResponseSchema, ingestEventResponseSchema } from "./schema";
import { createIngestEvent } from "./service";

export const ingestModule = new Elysia({
	prefix: "/ingest",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.post(
		"/events",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await createIngestEvent(db, {
				dedupeKey: body.dedupeKey,
				sourceSystem: body.sourceSystem,
				eventType: body.eventType,
				occurredAt: body.occurredAt,
				runNo: body.runNo ?? null,
				payload: body.payload,
				meta: body.meta ?? null,
			});

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: `${body.sourceSystem}:${body.dedupeKey}`,
					entityDisplay: "INGEST_EVENT",
					action: "INGEST_EVENT_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: {
						sourceSystem: body.sourceSystem,
						eventType: body.eventType,
						dedupeKey: body.dedupeKey,
					},
				});
				return error(result.status ?? 400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.eventId,
				entityDisplay: "INGEST_EVENT",
				action: "INGEST_EVENT_CREATE",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: body.sourceSystem,
					eventType: body.eventType,
					dedupeKey: body.dedupeKey,
					duplicate: result.data.duplicate,
				},
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_INTEGRATION,
			body: ingestEventCreateSchema,
			response: {
				200: ingestEventResponseSchema,
				400: ingestEventErrorResponseSchema,
				404: ingestEventErrorResponseSchema,
			},
			detail: { tags: ["MES - Ingest"] },
		},
	);
