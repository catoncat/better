import { Elysia, t } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { integrationReceiveWorkOrderSchema, integrationWorkOrderResponseSchema } from "./schema";
import { receiveWorkOrder } from "./service";

export const integrationModule = new Elysia({
	prefix: "/integration",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.post(
		"/work-orders",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.workOrder.findUnique({ where: { woNo: body.woNo } });

			try {
				const wo = await receiveWorkOrder(db, body);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.WORK_ORDER,
					entityId: wo.id,
					entityDisplay: wo.woNo,
					action: "WORK_ORDER_RECEIVE",
					actor,
					status: "SUCCESS",
					before,
					after: wo,
					request: requestMeta,
					payload: { sourceSystem: body.sourceSystem ?? null },
				});
				return { ok: true, data: wo };
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.WORK_ORDER,
					entityId: body.woNo,
					entityDisplay: body.woNo,
					action: "WORK_ORDER_RECEIVE",
					actor,
					status: "FAIL",
					errorCode: "WORK_ORDER_RECEIVE_FAILED",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
					before,
					request: requestMeta,
					payload: { sourceSystem: body.sourceSystem ?? null },
				});
				throw error;
			}
		},
		{
			isAuth: true,
			body: integrationReceiveWorkOrderSchema,
			response: integrationWorkOrderResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	);
