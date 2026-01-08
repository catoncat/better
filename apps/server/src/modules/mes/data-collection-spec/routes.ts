import { AuditEntityType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	dataCollectionSpecCreateSchema,
	dataCollectionSpecErrorResponseSchema,
	dataCollectionSpecIdParamsSchema,
	dataCollectionSpecListQuerySchema,
	dataCollectionSpecListResponseSchema,
	dataCollectionSpecResponseSchema,
	dataCollectionSpecUpdateSchema,
} from "./schema";
import {
	createDataCollectionSpec,
	getDataCollectionSpec,
	listDataCollectionSpecs,
	updateDataCollectionSpec,
} from "./service";

export const dataCollectionSpecModule = new Elysia({
	prefix: "/data-collection-specs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listDataCollectionSpecs(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: [Permission.DATA_SPEC_READ, Permission.DATA_SPEC_CONFIG],
			query: dataCollectionSpecListQuerySchema,
			response: dataCollectionSpecListResponseSchema,
			detail: { tags: ["MES - Data Collection"], summary: "List data collection specs" },
		},
	)
	.get(
		"/:specId",
		async ({ db, params, set }) => {
			const result = await getDataCollectionSpec(db, params.specId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: [Permission.DATA_SPEC_READ, Permission.DATA_SPEC_CONFIG],
			params: dataCollectionSpecIdParamsSchema,
			response: {
				200: dataCollectionSpecResponseSchema,
				400: dataCollectionSpecErrorResponseSchema,
				404: dataCollectionSpecErrorResponseSchema,
			},
			detail: { tags: ["MES - Data Collection"], summary: "Get data collection spec" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createDataCollectionSpec(db, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: body.operationCode,
					entityDisplay: body.name,
					action: "DATA_SPEC_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `${result.data.operationCode}/${result.data.name}`,
				action: "DATA_SPEC_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.DATA_SPEC_CONFIG,
			body: dataCollectionSpecCreateSchema,
			response: {
				201: dataCollectionSpecResponseSchema,
				400: dataCollectionSpecErrorResponseSchema,
				404: dataCollectionSpecErrorResponseSchema,
				409: dataCollectionSpecErrorResponseSchema,
			},
			detail: { tags: ["MES - Data Collection"], summary: "Create data collection spec" },
		},
	)
	.patch(
		"/:specId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.dataCollectionSpec.findUnique({
				where: { id: params.specId },
				include: { operation: { select: { id: true, code: true, name: true } } },
			});

			const result = await updateDataCollectionSpec(db, params.specId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.specId,
					entityDisplay: before ? `${before.operation.code}/${before.name}` : params.specId,
					action: "DATA_SPEC_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `${result.data.operationCode}/${result.data.name}`,
				action: "DATA_SPEC_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: body,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.DATA_SPEC_CONFIG,
			params: dataCollectionSpecIdParamsSchema,
			body: dataCollectionSpecUpdateSchema,
			response: {
				200: dataCollectionSpecResponseSchema,
				400: dataCollectionSpecErrorResponseSchema,
				404: dataCollectionSpecErrorResponseSchema,
				409: dataCollectionSpecErrorResponseSchema,
			},
			detail: { tags: ["MES - Data Collection"], summary: "Update data collection spec" },
		},
	);
