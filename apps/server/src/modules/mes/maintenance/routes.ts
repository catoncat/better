import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	errorResponseSchema,
	maintenanceCompleteSchema,
	maintenanceCreateSchema,
	maintenanceIdParamSchema,
	maintenanceListQuerySchema,
	maintenanceListResponseSchema,
	maintenanceResponseSchema,
	maintenanceUpdateSchema,
	maintenanceVerifySchema,
} from "./schema";
import {
	completeMaintenanceRecord,
	createMaintenanceRecord,
	getMaintenanceRecord,
	listMaintenanceRecords,
	updateMaintenanceRecord,
	verifyMaintenanceRecord,
} from "./service";

export const maintenanceRoutes = new Elysia({ prefix: "/maintenance-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listMaintenanceRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: maintenanceListQuerySchema,
			response: { 200: maintenanceListResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "List maintenance records" },
		},
	)
	.get(
		"/:maintenanceId",
		async ({ db, params, set }) => {
			const result = await getMaintenanceRecord(db, params.maintenanceId);
			if (!result.success) {
				set.status = 404;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			params: maintenanceIdParamSchema,
			response: { 200: maintenanceResponseSchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "Get maintenance record by ID" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const result = await createMaintenanceRecord(db, body, user.id);
			if (!result.success) {
				set.status = 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.MAINTENANCE_RECORD,
				entityId: result.data.id,
				entityDisplay: `${result.data.entityType}:${result.data.entityId}`,
				action: "CREATE",
				actor: buildAuditActor(user),
				status: "SUCCESS",
				payload: body,
				request: buildAuditRequestMeta(request),
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: maintenanceCreateSchema,
			response: { 201: maintenanceResponseSchema, 400: errorResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "Create maintenance record" },
		},
	)
	.patch(
		"/:maintenanceId",
		async ({ db, params, body, set, user, request }) => {
			const result = await updateMaintenanceRecord(db, params.maintenanceId, body);
			if (!result.success) {
				set.status = result.code === "NOT_FOUND" ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.MAINTENANCE_RECORD,
				entityId: result.data.id,
				entityDisplay: `${result.data.entityType}:${result.data.entityId}`,
				action: "UPDATE",
				actor: buildAuditActor(user),
				status: "SUCCESS",
				payload: body,
				request: buildAuditRequestMeta(request),
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			params: maintenanceIdParamSchema,
			body: maintenanceUpdateSchema,
			response: { 200: maintenanceResponseSchema, 400: errorResponseSchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "Update maintenance record" },
		},
	)
	.post(
		"/:maintenanceId/complete",
		async ({ db, params, body, set, user, request }) => {
			const result = await completeMaintenanceRecord(db, params.maintenanceId, body, user.id);
			if (!result.success) {
				set.status = result.code === "NOT_FOUND" ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.MAINTENANCE_RECORD,
				entityId: result.data.id,
				entityDisplay: `${result.data.entityType}:${result.data.entityId}`,
				action: "COMPLETE",
				actor: buildAuditActor(user),
				status: "SUCCESS",
				payload: body,
				request: buildAuditRequestMeta(request),
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			params: maintenanceIdParamSchema,
			body: maintenanceCompleteSchema,
			response: { 200: maintenanceResponseSchema, 400: errorResponseSchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "Complete maintenance record" },
		},
	)
	.post(
		"/:maintenanceId/verify",
		async ({ db, params, body, set, user, request }) => {
			const result = await verifyMaintenanceRecord(db, params.maintenanceId, user.id, body.remark);
			if (!result.success) {
				set.status = result.code === "NOT_FOUND" ? 404 : 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.MAINTENANCE_RECORD,
				entityId: result.data.id,
				entityDisplay: `${result.data.entityType}:${result.data.entityId}`,
				action: "VERIFY",
				actor: buildAuditActor(user),
				status: "SUCCESS",
				payload: body,
				request: buildAuditRequestMeta(request),
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_OVERRIDE,
			params: maintenanceIdParamSchema,
			body: maintenanceVerifySchema,
			response: { 200: maintenanceResponseSchema, 400: errorResponseSchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Maintenance"], summary: "Verify completed maintenance record" },
		},
	);
