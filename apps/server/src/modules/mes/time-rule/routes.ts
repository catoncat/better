import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	timeRuleDefinitionCreateSchema,
	timeRuleDefinitionListQuerySchema,
	timeRuleDefinitionListResponseSchema,
	timeRuleDefinitionResponseSchema,
	timeRuleErrorResponseSchema,
	timeRuleInstanceListResponseSchema,
	timeRuleInstanceResponseSchema,
	timeRuleInstanceWaiveSchema,
} from "./schema";
import { createDefinition, listDefinitions, listInstancesByRun, waiveInstance } from "./service";

export const timeRuleRoutes = new Elysia({ prefix: "/time-rules" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// ==========================================
	// Definition Routes
	// ==========================================
	.get(
		"/definitions",
		async ({ db, query }) => {
			const result = await listDefinitions(db, {
				activeOnly: query.activeOnly === true,
			});
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: timeRuleDefinitionListQuerySchema,
			response: {
				200: timeRuleDefinitionListResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "List time rule definitions" },
		},
	)
	.post(
		"/definitions",
		async ({ db, body, set }) => {
			const result = await createDefinition(db, body);

			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			body: timeRuleDefinitionCreateSchema,
			response: {
				201: timeRuleDefinitionResponseSchema,
				400: timeRuleErrorResponseSchema,
				409: timeRuleErrorResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "Create time rule definition" },
		},
	)
	// ==========================================
	// Instance Routes
	// ==========================================
	.get(
		"/runs/:runId/instances",
		async ({ db, params }) => {
			const result = await listInstancesByRun(db, params.runId);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			response: {
				200: timeRuleInstanceListResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "List time rule instances for a run" },
		},
	)
	.post(
		"/instances/:instanceId/waive",
		async ({ db, params, body, user, set }) => {
			const result = await waiveInstance(db, {
				instanceId: params.instanceId,
				waivedBy: user.id,
				waiveReason: body.waiveReason,
			});

			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_OVERRIDE,
			body: timeRuleInstanceWaiveSchema,
			response: {
				200: timeRuleInstanceResponseSchema,
				400: timeRuleErrorResponseSchema,
				404: timeRuleErrorResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "Waive a time rule instance" },
		},
	);
