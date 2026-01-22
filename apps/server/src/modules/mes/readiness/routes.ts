import { AuditEntityType } from "@better-app/db";
import { Elysia, status } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	checkHistorySchema,
	checkResponseSchema,
	errorResponseSchema,
	exceptionsQuerySchema,
	exceptionsResponseSchema,
	itemIdParamSchema,
	latestQuerySchema,
	runNoParamSchema,
	waiveBodySchema,
	waiveResponseSchema,
} from "./schema";
import {
	getCheckHistory,
	getLatestCheck,
	listRunsWithExceptions,
	performCheck,
	waiveItem,
} from "./service";

export const readinessModule = new Elysia({ prefix: "/runs" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.post(
		"/:runNo/readiness/precheck",
		async ({ db, params, user, request, set }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);

			const result = await performCheck(db, params.runNo, "PRECHECK", user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.READINESS_CHECK,
					entityId: params.runNo,
					entityDisplay: `Precheck for ${params.runNo}`,
					action: "READINESS_PRECHECK",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: meta,
				});
				set.status = result.status ?? 400;
				return {
					ok: false,
					error: { code: result.code, message: result.message },
				};
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.READINESS_CHECK,
				entityId: result.data.checkId,
				entityDisplay: `Precheck for ${params.runNo}`,
				action: "READINESS_PRECHECK",
				actor,
				status: "SUCCESS",
				payload: { runNo: params.runNo, checkStatus: result.data.status },
				request: meta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			params: runNoParamSchema,
			response: {
				200: checkResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Readiness"] },
		},
	)
	.post(
		"/:runNo/readiness/check",
		async ({ db, params, user, request, set }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);

			const result = await performCheck(db, params.runNo, "FORMAL", user?.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.READINESS_CHECK,
					entityId: params.runNo,
					entityDisplay: `Formal check for ${params.runNo}`,
					action: "READINESS_FORMAL_CHECK",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: meta,
				});
				set.status = result.status ?? 400;
				return {
					ok: false,
					error: { code: result.code, message: result.message },
				};
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.READINESS_CHECK,
				entityId: result.data.checkId,
				entityDisplay: `Formal check for ${params.runNo}`,
				action: "READINESS_FORMAL_CHECK",
				actor,
				status: "SUCCESS",
				payload: { runNo: params.runNo, checkStatus: result.data.status },
				request: meta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			params: runNoParamSchema,
			response: {
				200: checkResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Readiness"] },
		},
	)
	.get(
		"/:runNo/readiness/latest",
		async ({ db, params, query }) => {
			const result = await getLatestCheck(db, params.runNo, query.type);

			if (!result.success) {
				return status(404, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}

			if (!result.data) {
				return status(404, {
					ok: false,
					error: {
						code: "NO_CHECK_FOUND",
						message: "No readiness check found for this run",
					},
				});
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			params: runNoParamSchema,
			query: latestQuerySchema,
			response: { 200: checkResponseSchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Readiness"] },
		},
	)
	.get(
		"/:runNo/readiness/history",
		async ({ db, params }) => {
			const result = await getCheckHistory(db, params.runNo);

			if (!result.success) {
				return status(404, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			params: runNoParamSchema,
			response: { 200: checkHistorySchema, 404: errorResponseSchema },
			detail: { tags: ["MES - Readiness"] },
		},
	)
	.post(
		"/:runNo/readiness/items/:itemId/waive",
		async ({ db, params, body, user, request, set }) => {
			if (!user?.id) {
				set.status = 401;
				return {
					ok: false,
					error: { code: "UNAUTHORIZED", message: "User not authenticated" },
				};
			}

			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);

			const result = await waiveItem(db, params.runNo, params.itemId, user.id, body.reason);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.READINESS_CHECK,
					entityId: params.itemId,
					entityDisplay: `Waive item ${params.itemId}`,
					action: "READINESS_WAIVE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: meta,
				});
				set.status = result.status ?? 400;
				return {
					ok: false,
					error: { code: result.code, message: result.message },
				};
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.READINESS_CHECK,
				entityId: params.itemId,
				entityDisplay: `Waive item ${params.itemId}`,
				action: "READINESS_WAIVE",
				actor,
				status: "SUCCESS",
				payload: {
					runNo: params.runNo,
					itemId: params.itemId,
					waiveReason: body.reason,
				},
				request: meta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_OVERRIDE,
			params: itemIdParamSchema,
			body: waiveBodySchema,
			response: {
				200: waiveResponseSchema,
				400: errorResponseSchema,
				401: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Readiness"] },
		},
	);

export const readinessExceptionsModule = new Elysia({ prefix: "/readiness" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/exceptions",
		async ({ db, query, set }) => {
			const result = await listRunsWithExceptions(db, query);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: exceptionsQuerySchema,
			response: { 200: exceptionsResponseSchema, 400: errorResponseSchema },
			detail: { tags: ["MES - Readiness"] },
		},
	);
