import { Elysia, t } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	executionConfigCreateSchema,
	executionConfigListResponseSchema,
	executionConfigResponseSchema,
	executionConfigUpdateSchema,
	routeCompileResponseSchema,
	routingCodeParamsSchema,
} from "./schema";
import {
	compileRouteExecution,
	createExecutionConfig,
	listExecutionConfigs,
	updateExecutionConfig,
} from "./service";

export const routingModule = new Elysia({
	prefix: "/routes",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/:routingCode/execution-config",
		async ({ db, params, set }) => {
			const result = await listExecutionConfigs(db, params.routingCode);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: routingCodeParamsSchema,
			response: executionConfigListResponseSchema,
			detail: { tags: ["MES - Routing"] },
		},
	)
	.post(
		"/:routingCode/execution-config",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createExecutionConfig(db, params.routingCode, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.routingCode,
					entityDisplay: params.routingCode,
					action: "ROUTE_EXEC_CONFIG_CREATE",
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
				entityDisplay: params.routingCode,
				action: "ROUTE_EXEC_CONFIG_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: routingCodeParamsSchema,
			body: executionConfigCreateSchema,
			response: executionConfigResponseSchema,
			detail: { tags: ["MES - Routing"] },
		},
	)
	.patch(
		"/:routingCode/execution-config/:configId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.routeExecutionConfig.findUnique({ where: { id: params.configId } });
			const result = await updateExecutionConfig(db, params.routingCode, params.configId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.configId,
					entityDisplay: params.routingCode,
					action: "ROUTE_EXEC_CONFIG_UPDATE",
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
				entityDisplay: params.routingCode,
				action: "ROUTE_EXEC_CONFIG_UPDATE",
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
			params: t.Intersect([routingCodeParamsSchema, t.Object({ configId: t.String() })]),
			body: executionConfigUpdateSchema,
			response: executionConfigResponseSchema,
			detail: { tags: ["MES - Routing"] },
		},
	)
	.post(
		"/:routingCode/compile",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await compileRouteExecution(db, params.routingCode);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.routingCode,
					entityDisplay: params.routingCode,
					action: "ROUTE_COMPILE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: params.routingCode,
				action: "ROUTE_COMPILE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: {
					status: result.data.status,
					versionNo: result.data.versionNo,
				},
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			params: routingCodeParamsSchema,
			response: routeCompileResponseSchema,
			detail: { tags: ["MES - Routing"] },
		},
	);
