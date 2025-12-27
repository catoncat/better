import { AuditEntityType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	syncErpBoms,
	syncErpMaterials,
	syncErpWorkCenters,
	syncErpWorkOrders,
} from "./erp-master-sync-service";
import {
	getMockErpMaterials,
	getMockErpRoutes,
	getMockErpWorkCenters,
	mockErpBoms,
	mockErpWorkOrders,
	mockTpmEquipments,
	mockTpmMaintenanceTasks,
	mockTpmStatusLogs,
} from "./mock-data";
import {
	erpBomPullResponseSchema,
	erpMasterSyncQuerySchema,
	erpMaterialPullResponseSchema,
	erpRoutePullResponseSchema,
	erpRouteSyncQuerySchema,
	erpWorkCenterPullResponseSchema,
	erpWorkOrderPullResponseSchema,
	integrationErrorResponseSchema,
	integrationReceiveWorkOrderSchema,
	integrationStatusResponseSchema,
	integrationWorkOrderResponseSchema,
	tpmEquipmentPullResponseSchema,
	tpmMaintenanceTaskPullResponseSchema,
	tpmStatusLogPullResponseSchema,
	tpmSyncQuerySchema,
} from "./schema";
import { receiveWorkOrder } from "./service";
import { syncErpRoutes } from "./sync-service";
import { syncTpmEquipment, syncTpmMaintenanceTasks, syncTpmStatusLogs } from "./tpm-sync-service";

export const integrationModule = new Elysia({
	prefix: "/integration",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/status",
		async ({ db }) => {
			const jobs = [
				{ sourceSystem: "ERP", entityType: "ROUTING", action: "CRON_ERP_ROUTE_SYNC" },
				{ sourceSystem: "ERP", entityType: "WORK_ORDER", action: "CRON_ERP_WORK_ORDER_SYNC" },
				{ sourceSystem: "ERP", entityType: "MATERIAL", action: "CRON_ERP_MATERIAL_SYNC" },
				{ sourceSystem: "ERP", entityType: "BOM", action: "CRON_ERP_BOM_SYNC" },
				{ sourceSystem: "ERP", entityType: "WORK_CENTER", action: "CRON_ERP_WORK_CENTER_SYNC" },
				{ sourceSystem: "TPM", entityType: "EQUIPMENT", action: "CRON_TPM_EQUIPMENT_SYNC" },
				{ sourceSystem: "TPM", entityType: "STATUS_LOG", action: "CRON_TPM_STATUS_LOG_SYNC" },
				{
					sourceSystem: "TPM",
					entityType: "MAINTENANCE_TASK",
					action: "CRON_TPM_MAINTENANCE_TASK_SYNC",
				},
			];

			const cursorFilters = jobs.map((job) => ({
				sourceSystem: job.sourceSystem,
				entityType: job.entityType,
			}));

			const [cursors, logs] = await Promise.all([
				db.integrationSyncCursor.findMany({ where: { OR: cursorFilters } }),
				db.systemLog.findMany({
					where: { action: { in: jobs.map((job) => job.action) } },
					orderBy: { createdAt: "desc" },
				}),
			]);

			const cursorByKey = new Map(
				cursors.map((cursor) => [`${cursor.sourceSystem}:${cursor.entityType}`, cursor]),
			);

			const logByAction = new Map<string, (typeof logs)[number]>();
			for (const log of logs) {
				if (!logByAction.has(log.action)) {
					logByAction.set(log.action, log);
				}
			}

			const jobStatuses = jobs.map((job) => {
				const cursor = cursorByKey.get(`${job.sourceSystem}:${job.entityType}`) ?? null;
				const lastCron = logByAction.get(job.action) ?? null;
				return {
					sourceSystem: job.sourceSystem,
					entityType: job.entityType,
					cursor: cursor
						? {
								sourceSystem: cursor.sourceSystem,
								entityType: cursor.entityType,
								lastSyncAt: cursor.lastSyncAt ? cursor.lastSyncAt.toISOString() : null,
								lastSeq: cursor.lastSeq ?? null,
								meta: cursor.meta ?? null,
								updatedAt: cursor.updatedAt.toISOString(),
							}
						: null,
					lastCron: lastCron
						? {
								action: lastCron.action,
								status: lastCron.status ?? "",
								createdAt: lastCron.createdAt.toISOString(),
								details: lastCron.details ?? null,
							}
						: null,
				};
			});

			return { ok: true, data: { jobs: jobStatuses } };
		},
		{
			isAuth: true,
			response: integrationStatusResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	)
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
			response: {
				200: erpRoutePullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/erp/work-orders/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncErpWorkOrders(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "ERP:WORK_ORDER",
					entityDisplay: "ERP WORK ORDER SYNC",
					action: "ERP_WORK_ORDER_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "ERP", entityType: "WORK_ORDER", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "ERP_WORK_ORDER_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "ERP",
					entityType: "WORK_ORDER",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: erpMasterSyncQuerySchema,
			response: {
				200: erpWorkOrderPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/erp/materials/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncErpMaterials(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "ERP:MATERIAL",
					entityDisplay: "ERP MATERIAL SYNC",
					action: "ERP_MATERIAL_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "ERP", entityType: "MATERIAL", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "ERP_MATERIAL_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "ERP",
					entityType: "MATERIAL",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: erpMasterSyncQuerySchema,
			response: {
				200: erpMaterialPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/erp/boms/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncErpBoms(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "ERP:BOM",
					entityDisplay: "ERP BOM SYNC",
					action: "ERP_BOM_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "ERP", entityType: "BOM", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "ERP_BOM_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "ERP",
					entityType: "BOM",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: erpMasterSyncQuerySchema,
			response: {
				200: erpBomPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/erp/work-centers/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncErpWorkCenters(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "ERP:WORK_CENTER",
					entityDisplay: "ERP WORK CENTER SYNC",
					action: "ERP_WORK_CENTER_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "ERP", entityType: "WORK_CENTER", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "ERP_WORK_CENTER_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "ERP",
					entityType: "WORK_CENTER",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: erpMasterSyncQuerySchema,
			response: {
				200: erpWorkCenterPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/tpm/equipment/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncTpmEquipment(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "TPM:EQUIPMENT",
					entityDisplay: "TPM EQUIPMENT SYNC",
					action: "TPM_EQUIPMENT_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "TPM", entityType: "EQUIPMENT", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "TPM_EQUIPMENT_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "TPM",
					entityType: "EQUIPMENT",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: tpmSyncQuerySchema,
			response: {
				200: tpmEquipmentPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/tpm/status-logs/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncTpmStatusLogs(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "TPM:STATUS_LOG",
					entityDisplay: "TPM STATUS LOG SYNC",
					action: "TPM_STATUS_LOG_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "TPM", entityType: "STATUS_LOG", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "TPM_STATUS_LOG_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "TPM",
					entityType: "STATUS_LOG",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: tpmSyncQuerySchema,
			response: {
				200: tpmStatusLogPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/tpm/maintenance-tasks/sync",
		async ({ query, set, db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await syncTpmMaintenanceTasks(db, { since: query.since });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: "TPM:MAINTENANCE_TASK",
					entityDisplay: "TPM MAINTENANCE TASK SYNC",
					action: "TPM_MAINTENANCE_TASK_SYNC",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { sourceSystem: "TPM", entityType: "MAINTENANCE_TASK", query },
				});
				set.status = result.status ?? 502;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.messageId,
				entityDisplay: result.data.businessKey,
				action: "TPM_MAINTENANCE_TASK_SYNC",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					sourceSystem: "TPM",
					entityType: "MAINTENANCE_TASK",
					query,
					dedupeKey: result.data.dedupeKey ?? null,
					cursor: result.data.payload.cursor,
				},
			});
			return { ok: true, data: result.data.payload };
		},
		{
			isAuth: true,
			query: tpmSyncQuerySchema,
			response: {
				200: tpmMaintenanceTaskPullResponseSchema,
				400: integrationErrorResponseSchema,
				502: integrationErrorResponseSchema,
			},
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
