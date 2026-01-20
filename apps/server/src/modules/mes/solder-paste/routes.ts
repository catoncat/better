import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	coldStorageTemperatureCreateSchema,
	coldStorageTemperatureListQuerySchema,
	coldStorageTemperatureListResponseSchema,
	coldStorageTemperatureResponseSchema,
	solderPasteUsageCreateSchema,
	solderPasteUsageListQuerySchema,
	solderPasteUsageListResponseSchema,
	solderPasteUsageResponseSchema,
} from "./schema";
import {
	createColdStorageTemperatureRecord,
	createSolderPasteUsageRecord,
	listColdStorageTemperatureRecords,
	listSolderPasteUsageRecords,
} from "./service";

export const solderPasteUsageRoutes = new Elysia({ prefix: "/solder-paste-usage-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listSolderPasteUsageRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: solderPasteUsageListQuerySchema,
			response: {
				200: solderPasteUsageListResponseSchema,
			},
			detail: { tags: ["MES - Solder Paste"], summary: "List solder paste usage records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createSolderPasteUsageRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SOLDER_PASTE_USAGE,
					entityId: body.lotId,
					entityDisplay: `Solder paste usage for ${body.lotId}`,
					action: "SOLDER_PASTE_USAGE_CREATE",
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
				entityType: AuditEntityType.SOLDER_PASTE_USAGE,
				entityId: result.data.id,
				entityDisplay: `Solder paste usage for ${result.data.lotId}`,
				action: "SOLDER_PASTE_USAGE_CREATE",
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
			body: solderPasteUsageCreateSchema,
			response: {
				201: solderPasteUsageResponseSchema,
			},
			detail: { tags: ["MES - Solder Paste"], summary: "Create solder paste usage record" },
		},
	);

export const coldStorageTemperatureRoutes = new Elysia({
	prefix: "/cold-storage-temperature-records",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listColdStorageTemperatureRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: coldStorageTemperatureListQuerySchema,
			response: {
				200: coldStorageTemperatureListResponseSchema,
			},
			detail: { tags: ["MES - Solder Paste"], summary: "List cold storage temperature records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createColdStorageTemperatureRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.COLD_STORAGE_TEMP,
					entityId: body.measuredAt,
					entityDisplay: `Cold storage temp at ${body.measuredAt}`,
					action: "COLD_STORAGE_TEMP_CREATE",
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
				entityType: AuditEntityType.COLD_STORAGE_TEMP,
				entityId: result.data.id,
				entityDisplay: `Cold storage temp at ${result.data.measuredAt}`,
				action: "COLD_STORAGE_TEMP_CREATE",
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
			body: coldStorageTemperatureCreateSchema,
			response: {
				201: coldStorageTemperatureResponseSchema,
			},
			detail: { tags: ["MES - Solder Paste"], summary: "Create cold storage temperature record" },
		},
	);
