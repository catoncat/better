import { AuditEntityType, getEffectiveDataScope, type Prisma } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { runResponseSchema } from "../run/schema";
import {
	runCreateSchema,
	workOrderErrorResponseSchema,
	workOrderListQuerySchema,
	workOrderReleaseSchema,
	workOrderResponseSchema,
	workOrderUpdatePickStatusSchema,
} from "./schema";
import {
	closeWorkOrder,
	createRun,
	listWorkOrders,
	releaseWorkOrder,
	updatePickStatus,
} from "./service";

const notFoundCodes = new Set(["WORK_ORDER_NOT_FOUND", "LINE_NOT_FOUND"]);

export const workOrderModule = new Elysia({
	prefix: "/work-orders",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query, userPermissions }) => {
			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, Permission.WO_READ)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			let extraWhere: Prisma.WorkOrderWhereInput | undefined;
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

				extraWhere = {
					runs: {
						some: {
							lineId: { in: lineIds },
						},
					},
				};
			}

			return listWorkOrders(db, query, extraWhere);
		},
		{
			isAuth: true,
			requirePermission: Permission.WO_READ,
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
					entityId: String(before?.id ?? woNo),
					entityDisplay: String(woNo),
					action: "WORK_ORDER_RELEASE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: {
						lineCode: body.lineCode ?? null,
						stationGroupCode: body.stationGroupCode ?? null,
					},
				});
				set.status = result.status ?? (notFoundCodes.has(result.code) ? 404 : 400);
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.WORK_ORDER,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.woNo),
				action: "WORK_ORDER_RELEASE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: {
					lineCode: body.lineCode ?? null,
					stationGroupCode: body.stationGroupCode ?? null,
				},
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.WO_RELEASE,
			params: t.Object({ woNo: t.String() }),
			body: workOrderReleaseSchema,
			response: {
				200: workOrderResponseSchema,
				400: workOrderErrorResponseSchema,
				404: workOrderErrorResponseSchema,
			},
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
					entityId: String(woNo),
					entityDisplay: String(woNo),
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
				set.status = result.status ?? (notFoundCodes.has(result.code) ? 404 : 400);
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.runNo),
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
			requirePermission: Permission.RUN_CREATE,
			params: t.Object({ woNo: t.String() }),
			body: runCreateSchema,
			response: {
				200: runResponseSchema,
				400: workOrderErrorResponseSchema,
				404: workOrderErrorResponseSchema,
			},
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.patch(
		"/:woNo/pick-status",
		async ({ db, params: { woNo }, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.workOrder.findUnique({ where: { woNo } });
			const result = await updatePickStatus(db, woNo, body.pickStatus);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.WORK_ORDER,
					entityId: String(before?.id ?? woNo),
					entityDisplay: String(woNo),
					action: "WORK_ORDER_PICK_STATUS_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: { pickStatus: body.pickStatus },
				});
				set.status = result.status ?? (notFoundCodes.has(result.code) ? 404 : 400);
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.WORK_ORDER,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.woNo),
				action: "WORK_ORDER_PICK_STATUS_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: { pickStatus: body.pickStatus },
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.WO_UPDATE,
			params: t.Object({ woNo: t.String() }),
			body: workOrderUpdatePickStatusSchema,
			response: {
				200: workOrderResponseSchema,
				400: workOrderErrorResponseSchema,
				404: workOrderErrorResponseSchema,
			},
			detail: { tags: ["MES - Work Orders"] },
		},
	)
	.post(
		"/:woNo/close",
		async ({ db, params: { woNo }, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.workOrder.findUnique({ where: { woNo } });

			const result = await closeWorkOrder(db, woNo);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.WORK_ORDER,
					entityId: String(before?.id ?? woNo),
					entityDisplay: String(woNo),
					action: "WORK_ORDER_CLOSE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? (notFoundCodes.has(result.code) ? 404 : 400);
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.WORK_ORDER,
				entityId: String(result.data.id),
				entityDisplay: String(result.data.woNo),
				action: "WORK_ORDER_CLOSE",
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
			requirePermission: Permission.WO_CLOSE,
			params: t.Object({ woNo: t.String() }),
			response: {
				200: workOrderResponseSchema,
				400: workOrderErrorResponseSchema,
				404: workOrderErrorResponseSchema,
				409: workOrderErrorResponseSchema,
			},
			detail: { tags: ["MES - Work Orders"], summary: "Work order closeout" },
		},
	);
