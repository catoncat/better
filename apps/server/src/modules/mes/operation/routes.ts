import { AuditEntityType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	operationCreateSchema,
	operationErrorResponseSchema,
	operationIdParamsSchema,
	operationListQuerySchema,
	operationListResponseSchema,
	operationResponseSchema,
	operationUpdateSchema,
} from "./schema";
import { createOperation, getOperation, listOperations, updateOperation } from "./service";

export const operationModule = new Elysia({
	prefix: "/operations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listOperations(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: [Permission.OPERATION_READ, Permission.DATA_SPEC_CONFIG],
			query: operationListQuerySchema,
			response: operationListResponseSchema,
			detail: { tags: ["MES - Operation"], summary: "List operations" },
		},
	)
	.get(
		"/:operationId",
		async ({ db, params, set }) => {
			const result = await getOperation(db, params.operationId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: [Permission.OPERATION_READ, Permission.DATA_SPEC_CONFIG],
			params: operationIdParamsSchema,
			response: {
				200: operationResponseSchema,
				400: operationErrorResponseSchema,
				404: operationErrorResponseSchema,
			},
			detail: { tags: ["MES - Operation"], summary: "Get operation" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createOperation(db, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: body.code,
					entityDisplay: body.name,
					action: "OPERATION_CREATE",
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
				entityDisplay: `${result.data.code} - ${result.data.name}`,
				action: "OPERATION_CREATE",
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
			requirePermission: Permission.OPERATION_CONFIG,
			body: operationCreateSchema,
			response: {
				201: operationResponseSchema,
				400: operationErrorResponseSchema,
				409: operationErrorResponseSchema,
			},
			detail: { tags: ["MES - Operation"], summary: "Create MES-Native operation" },
		},
	)
	.patch(
		"/:operationId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.operation.findUnique({
				where: { id: params.operationId },
			});

			const result = await updateOperation(db, params.operationId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.operationId,
					entityDisplay: before ? `${before.code} - ${before.name}` : params.operationId,
					action: "OPERATION_UPDATE",
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
				entityDisplay: `${result.data.code} - ${result.data.name}`,
				action: "OPERATION_UPDATE",
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
			requirePermission: Permission.OPERATION_CONFIG,
			params: operationIdParamsSchema,
			body: operationUpdateSchema,
			response: {
				200: operationResponseSchema,
				400: operationErrorResponseSchema,
				403: operationErrorResponseSchema,
				404: operationErrorResponseSchema,
			},
			detail: { tags: ["MES - Operation"], summary: "Update MES-Native operation" },
		},
	);
