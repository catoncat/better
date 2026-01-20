import { AuditEntityType } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { triggerPrecheckForAffectedRuns } from "../readiness/service";
import {
	executionConfigCreateSchema,
	executionConfigListResponseSchema,
	executionConfigResponseSchema,
	executionConfigUpdateSchema,
	routeCompileResponseSchema,
	routeDetailResponseSchema,
	routeErrorResponseSchema,
	routeListQuerySchema,
	routeListResponseSchema,
	routeProcessTypeResponseSchema,
	routeProcessTypeUpdateSchema,
	routeVersionListResponseSchema,
	routeVersionResponseSchema,
	routingCodeParamsSchema,
} from "./schema";
import {
	compileRouteExecution,
	createExecutionConfig,
	getRouteDetail,
	getRouteVersion,
	listExecutionConfigs,
	listRoutes,
	listRouteVersions,
	updateExecutionConfig,
	updateRouteProcessType,
} from "./service";

export const routingModule = new Elysia({
	prefix: "/routes",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get("/", async ({ db, query }) => listRoutes(db, query), {
		isAuth: true,
		requirePermission: Permission.ROUTE_READ,
		query: routeListQuerySchema,
		response: routeListResponseSchema,
		detail: { tags: ["MES - Routing"] },
	})
	.get(
		"/:routingCode",
		async ({ db, params, set }) => {
			const result = await getRouteDetail(db, params.routingCode);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return result.data;
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: routingCodeParamsSchema,
			response: {
				200: routeDetailResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
			detail: { tags: ["MES - Routing"] },
		},
	)
	.patch(
		"/:routingCode",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.routing.findUnique({ where: { code: params.routingCode } });

			const result = await updateRouteProcessType(db, params.routingCode, body.processType);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.routingCode,
					entityDisplay: params.routingCode,
					action: "ROUTE_PROCESS_TYPE_UPDATE",
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
				entityDisplay: result.data.code,
				action: "ROUTE_PROCESS_TYPE_UPDATE",
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
			requirePermission: Permission.ROUTE_CONFIGURE,
			params: routingCodeParamsSchema,
			body: routeProcessTypeUpdateSchema,
			response: {
				200: routeProcessTypeResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
			detail: { tags: ["MES - Routing"] },
		},
	)
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
			requirePermission: Permission.ROUTE_READ,
			params: routingCodeParamsSchema,
			response: {
				200: executionConfigListResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
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
			requirePermission: Permission.ROUTE_CONFIGURE,
			params: routingCodeParamsSchema,
			body: executionConfigCreateSchema,
			response: {
				200: executionConfigResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
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
			requirePermission: Permission.ROUTE_CONFIGURE,
			params: t.Intersect([routingCodeParamsSchema, t.Object({ configId: t.String() })]),
			body: executionConfigUpdateSchema,
			response: {
				200: executionConfigResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
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
			triggerPrecheckForAffectedRuns(db, { routeVersionId: result.data.id }).catch(() => {});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_COMPILE,
			params: routingCodeParamsSchema,
			response: {
				200: routeCompileResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
			detail: { tags: ["MES - Routing"] },
		},
	)
	.get(
		"/:routingCode/versions",
		async ({ db, params, set }) => {
			const result = await listRouteVersions(db, params.routingCode);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: { items: result.data } };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: routingCodeParamsSchema,
			response: {
				200: routeVersionListResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
			detail: { tags: ["MES - Routing"] },
		},
	)
	.get(
		"/:routingCode/versions/:versionNo",
		async ({ db, params, set }) => {
			const result = await getRouteVersion(db, params.routingCode, params.versionNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: t.Intersect([routingCodeParamsSchema, t.Object({ versionNo: t.Numeric() })]),
			response: {
				200: routeVersionResponseSchema,
				400: routeErrorResponseSchema,
				404: routeErrorResponseSchema,
			},
			detail: { tags: ["MES - Routing"] },
		},
	);
