import { AuditEntityType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	syncErpBoms,
	syncErpMaterials,
	syncErpRoutes,
	syncErpWorkCenters,
	syncErpWorkOrders,
} from "./erp";
import {
	bindSolderPasteToLine,
	bindStencilToLine,
	unbindSolderPasteFromLine,
	unbindStencilFromLine,
} from "./line-binding-service";
import {
	lineSolderPasteBindResponseSchema,
	lineSolderPasteBindSchema,
	lineSolderPasteUnbindResponseSchema,
	lineStencilBindResponseSchema,
	lineStencilBindSchema,
	lineStencilUnbindResponseSchema,
	solderPasteStatusReceiveSchema,
	solderPasteStatusResponseSchema,
	stencilStatusReceiveSchema,
	stencilStatusResponseSchema,
} from "./loading-schema";
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
import { receiveSolderPasteStatus } from "./solder-paste-service";
import { receiveStencilStatus } from "./stencil-service";
import { syncTpmEquipment, syncTpmMaintenanceTasks, syncTpmStatusLogs } from "./tpm-sync-service";

export const integrationModule = new Elysia({
	prefix: "/integration",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
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
				cursors.map((cursor) => [
					`${String(cursor.sourceSystem)}:${String(cursor.entityType)}`,
					cursor,
				]),
			);

			const logByAction = new Map<string, (typeof logs)[number]>();
			for (const log of logs) {
				const actionKey = String(log.action);
				if (!logByAction.has(actionKey)) {
					logByAction.set(actionKey, log);
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
								sourceSystem: String(cursor.sourceSystem),
								entityType: String(cursor.entityType),
								lastSyncAt: cursor.lastSyncAt
									? new Date(String(cursor.lastSyncAt)).toISOString()
									: null,
								lastSeq:
									cursor.lastSeq == null
										? null
										: typeof cursor.lastSeq === "string"
											? cursor.lastSeq
											: String(cursor.lastSeq),
								meta: cursor.meta ?? null,
								updatedAt: new Date(String(cursor.updatedAt)).toISOString(),
							}
						: null,
					lastCron: lastCron
						? {
								action: String(lastCron.action),
								status: lastCron.status == null ? "" : String(lastCron.status),
								createdAt: new Date(String(lastCron.createdAt)).toISOString(),
								details: lastCron.details ?? null,
							}
						: null,
				};
			});

			return { ok: true, data: { jobs: jobStatuses } };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
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
			requirePermission: Permission.SYSTEM_INTEGRATION,
			body: integrationReceiveWorkOrderSchema,
			response: integrationWorkOrderResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	)
	// ==========================================
	// Stencil Status Endpoint (Phase 3.1)
	// ==========================================
	.post(
		"/stencil-status",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			try {
				const result = await receiveStencilStatus(db, body);

				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: result.id,
					entityDisplay: `Stencil ${result.stencilId}`,
					action: "STENCIL_STATUS_RECEIVE",
					actor,
					status: "SUCCESS",
					request: requestMeta,
					payload: {
						sourceSystem: "TPM",
						entityType: "STENCIL_STATUS",
						eventId: result.eventId,
						stencilId: result.stencilId,
						status: result.status,
						isDuplicate: result.isDuplicate,
					},
				});

				return { ok: true, data: result };
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: body.eventId,
					entityDisplay: `Stencil ${body.stencilId}`,
					action: "STENCIL_STATUS_RECEIVE",
					actor,
					status: "FAIL",
					errorCode: "STENCIL_STATUS_RECEIVE_FAILED",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
					request: requestMeta,
					payload: { sourceSystem: "TPM", entityType: "STENCIL_STATUS" },
				});
				throw error;
			}
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_INTEGRATION,
			body: stencilStatusReceiveSchema,
			response: stencilStatusResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	)
	// ==========================================
	// Solder Paste Status Endpoint (Phase 3.2)
	// ==========================================
	.post(
		"/solder-paste-status",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			try {
				const result = await receiveSolderPasteStatus(db, body);

				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: result.id,
					entityDisplay: `Solder Paste ${result.lotId}`,
					action: "SOLDER_PASTE_STATUS_RECEIVE",
					actor,
					status: "SUCCESS",
					request: requestMeta,
					payload: {
						sourceSystem: "WMS",
						entityType: "SOLDER_PASTE_STATUS",
						eventId: result.eventId,
						lotId: result.lotId,
						status: result.status,
						isDuplicate: result.isDuplicate,
					},
				});

				return { ok: true, data: result };
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: body.eventId,
					entityDisplay: `Solder Paste ${body.lotId}`,
					action: "SOLDER_PASTE_STATUS_RECEIVE",
					actor,
					status: "FAIL",
					errorCode: "SOLDER_PASTE_STATUS_RECEIVE_FAILED",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
					request: requestMeta,
					payload: { sourceSystem: "WMS", entityType: "SOLDER_PASTE_STATUS" },
				});
				throw error;
			}
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_INTEGRATION,
			body: solderPasteStatusReceiveSchema,
			response: solderPasteStatusResponseSchema,
			detail: { tags: ["MES - Integration"] },
		},
	)
	// ==========================================
	// Line Stencil Binding APIs (Phase 3.4)
	// ==========================================
	.post(
		"/lines/:lineId/stencil/bind",
		async ({ db, params, body, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await bindStencilToLine(db, params.lineId, body.stencilId, user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: params.lineId,
					entityDisplay: `Line ${params.lineId} Stencil Bind`,
					action: "LINE_STENCIL_BIND",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { lineId: params.lineId, stencilId: body.stencilId },
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.id,
				entityDisplay: `Line ${params.lineId} - Stencil ${body.stencilId}`,
				action: "LINE_STENCIL_BIND",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: { lineId: params.lineId, stencilId: body.stencilId, bindingId: result.data.id },
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			body: lineStencilBindSchema,
			response: {
				200: lineStencilBindResponseSchema,
				400: integrationErrorResponseSchema,
				404: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/lines/:lineId/stencil/unbind",
		async ({ db, params, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await unbindStencilFromLine(db, params.lineId, user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: params.lineId,
					entityDisplay: `Line ${params.lineId} Stencil Unbind`,
					action: "LINE_STENCIL_UNBIND",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { lineId: params.lineId },
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.id,
				entityDisplay: `Line ${params.lineId} - Stencil ${result.data.stencilId}`,
				action: "LINE_STENCIL_UNBIND",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					lineId: params.lineId,
					stencilId: result.data.stencilId,
					bindingId: result.data.id,
				},
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			response: {
				200: lineStencilUnbindResponseSchema,
				400: integrationErrorResponseSchema,
				404: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	// ==========================================
	// Line Solder Paste Binding APIs (Phase 3.4)
	// ==========================================
	.post(
		"/lines/:lineId/solder-paste/bind",
		async ({ db, params, body, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await bindSolderPasteToLine(db, params.lineId, body.lotId, user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: params.lineId,
					entityDisplay: `Line ${params.lineId} Solder Paste Bind`,
					action: "LINE_SOLDER_PASTE_BIND",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { lineId: params.lineId, lotId: body.lotId },
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.id,
				entityDisplay: `Line ${params.lineId} - Solder Paste ${body.lotId}`,
				action: "LINE_SOLDER_PASTE_BIND",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: { lineId: params.lineId, lotId: body.lotId, bindingId: result.data.id },
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			body: lineSolderPasteBindSchema,
			response: {
				200: lineSolderPasteBindResponseSchema,
				400: integrationErrorResponseSchema,
				404: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	)
	.post(
		"/lines/:lineId/solder-paste/unbind",
		async ({ db, params, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await unbindSolderPasteFromLine(db, params.lineId, user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INTEGRATION,
					entityId: params.lineId,
					entityDisplay: `Line ${params.lineId} Solder Paste Unbind`,
					action: "LINE_SOLDER_PASTE_UNBIND",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: { lineId: params.lineId },
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INTEGRATION,
				entityId: result.data.id,
				entityDisplay: `Line ${params.lineId} - Solder Paste ${result.data.lotId}`,
				action: "LINE_SOLDER_PASTE_UNBIND",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: { lineId: params.lineId, lotId: result.data.lotId, bindingId: result.data.id },
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			response: {
				200: lineSolderPasteUnbindResponseSchema,
				400: integrationErrorResponseSchema,
				404: integrationErrorResponseSchema,
			},
			detail: { tags: ["MES - Integration"] },
		},
	);
