import { Elysia, t } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { runResponseSchema } from "../run/schema";
import {
	runCreateSchema,
	workOrderListQuerySchema,
	workOrderReleaseSchema,
	workOrderResponseSchema,
} from "./schema";
import { createRun, listWorkOrders, releaseWorkOrder } from "./service";

const notFoundCodes = new Set(["WORK_ORDER_NOT_FOUND", "LINE_NOT_FOUND"]);

export const workOrderModule = new Elysia({
	prefix: "/work-orders",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			return listWorkOrders(db, query);
		},
		{
			isAuth: true,
			query: workOrderListQuerySchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/release",
		async ({ db, params: { woNo }, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.workOrder.findUnique({ where: { woNo } });
			const result = await releaseWorkOrder(db, woNo, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.WORK_ORDER,
					entityId: before?.id ?? woNo,
					entityDisplay: woNo,
					action: "WORK_ORDER_RELEASE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: { lineCode: body.lineCode ?? null, stationGroupCode: body.stationGroupCode ?? null },
				});
				set.status = notFoundCodes.has(result.code) ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.WORK_ORDER,
				entityId: result.data.id,
				entityDisplay: result.data.woNo,
				action: "WORK_ORDER_RELEASE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: { lineCode: body.lineCode ?? null, stationGroupCode: body.stationGroupCode ?? null },
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ woNo: t.String() }),
			body: workOrderReleaseSchema,
			response: workOrderResponseSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/runs",
		async ({ db, params: { woNo }, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createRun(db, woNo, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: woNo,
					entityDisplay: woNo,
					action: "RUN_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: {
						woNo,
						lineCode: body.lineCode ?? null,
						shiftCode: body.shiftCode ?? null,
						changeoverNo: body.changeoverNo ?? null,
					},
				});
				set.status = notFoundCodes.has(result.code) ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: result.data.id,
				entityDisplay: result.data.runNo,
				action: "RUN_CREATE",
				actor,
				status: "SUCCESS",
				before: null,
				after: result.data,
				request: requestMeta,
				payload: {
					woNo,
					lineCode: body.lineCode ?? null,
					shiftCode: body.shiftCode ?? null,
					changeoverNo: body.changeoverNo ?? null,
				},
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: t.Object({ woNo: t.String() }),
			body: runCreateSchema,
			response: runResponseSchema,
			detail: { tags: ["MES - Work Orders"] },
		},
	);
