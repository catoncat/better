import { Elysia, t } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	erpBomPullResponseSchema,
	erpMaterialPullResponseSchema,
	erpRoutePullResponseSchema,
	erpWorkCenterPullResponseSchema,
	erpWorkOrderPullResponseSchema,
	integrationReceiveWorkOrderSchema,
	integrationWorkOrderResponseSchema,
	erpRouteSyncQuerySchema,
	tpmEquipmentPullResponseSchema,
	tpmMaintenanceTaskPullResponseSchema,
	tpmStatusLogPullResponseSchema,
} from "./schema";
import {
	mockErpBoms,
	mockErpWorkOrders,
	mockTpmEquipments,
	mockTpmMaintenanceTasks,
	mockTpmStatusLogs,
	getMockErpMaterials,
	getMockErpRoutes,
	getMockErpWorkCenters,
} from "./mock-data";
import { syncErpRoutes } from "./sync-service";
import { receiveWorkOrder } from "./service";

export const integrationModule = new Elysia({
	prefix: "/integration",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/mock/erp/routes",
		async () => ({
			ok: true,
			data: {
				sourceSystem: "ERP",
				entityType: "ROUTING",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: await getMockErpRoutes(),
			},
		}),
		{
			isAuth: true,
			response: erpRoutePullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/erp/work-orders",
		() => ({
			ok: true,
			data: {
				sourceSystem: "ERP",
				entityType: "WORK_ORDER",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: mockErpWorkOrders,
			},
		}),
		{
			isAuth: true,
			response: erpWorkOrderPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/erp/materials",
		async () => ({
			ok: true,
			data: {
				sourceSystem: "ERP",
				entityType: "MATERIAL",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: await getMockErpMaterials(),
			},
		}),
		{
			isAuth: true,
			response: erpMaterialPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/erp/boms",
		() => ({
			ok: true,
			data: {
				sourceSystem: "ERP",
				entityType: "BOM",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: mockErpBoms,
			},
		}),
		{
			isAuth: true,
			response: erpBomPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/erp/work-centers",
		async () => ({
			ok: true,
			data: {
				sourceSystem: "ERP",
				entityType: "WORK_CENTER",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: await getMockErpWorkCenters(),
			},
		}),
		{
			isAuth: true,
			response: erpWorkCenterPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/tpm/equipment",
		() => ({
			ok: true,
			data: {
				sourceSystem: "TPM",
				entityType: "EQUIPMENT",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: mockTpmEquipments,
			},
		}),
		{
			isAuth: true,
			response: tpmEquipmentPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/tpm/status-logs",
		() => ({
			ok: true,
			data: {
				sourceSystem: "TPM",
				entityType: "STATUS_LOG",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: mockTpmStatusLogs,
			},
		}),
		{
			isAuth: true,
			response: tpmStatusLogPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.get(
		"/mock/tpm/maintenance-tasks",
		() => ({
			ok: true,
			data: {
				sourceSystem: "TPM",
				entityType: "MAINTENANCE_TASK",
				cursor: { nextSyncAt: "2025-03-27T14:00:00Z", hasMore: false },
				items: mockTpmMaintenanceTasks,
			},
		}),
		{
			isAuth: true,
			response: tpmMaintenanceTaskPullResponseSchema,
			detail: { tags: ["MES - Integration (Mock)"] },
		},
	)
	.post(
		"/erp/routes/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncErpRoutes(db, {
				since: query.since,
				startRow: query.startRow,
				limit: query.limit,
			});
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "ERP:ROUTING",
					entityDisplay: "ERP ROUTING SYNC",
					action: "ERP_ROUTE_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: {
						sourceSystem: "ERP",
						entityType: "ROUTING",
						query,
					},
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "ERP_ROUTE_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "ERP",
					entityType: "ROUTING",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: erpRouteSyncQuerySchema,
			response: erpRoutePullResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	)
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
