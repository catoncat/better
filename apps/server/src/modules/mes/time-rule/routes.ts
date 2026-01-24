import type { TimeRuleType } from "@better-app/db";
import Elysia, { t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	timeRuleDefinitionCreateSchema,
	timeRuleDefinitionListQuerySchema,
	timeRuleDefinitionListResponseSchema,
	timeRuleDefinitionResponseSchema,
	timeRuleDefinitionUpdateSchema,
	timeRuleErrorResponseSchema,
	timeRuleInstanceListResponseSchema,
	timeRuleInstanceResponseSchema,
	timeRuleInstanceWaiveSchema,
} from "./schema";
import {
	type CreateDefinitionInput,
	createDefinition,
	deleteDefinition,
	getDefinitionById,
	listDefinitions,
	listInstancesByRun,
	type UpdateDefinitionInput,
	updateDefinition,
	waiveInstance,
} from "./service";

export const timeRuleRoutes = new Elysia({ prefix: "/time-rules" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// ==========================================
	// Definition Routes
	// ==========================================
	.get(
		"/",
		async ({ db, query }) => {
			const ruleType = query.ruleType ? (query.ruleType as TimeRuleType) : undefined;
			const result = await listDefinitions(db, {
				page: query.page,
				pageSize: query.pageSize,
				code: query.code,
				name: query.name,
				ruleType,
				isActive: query.isActive === "true" ? true : query.isActive === "false" ? false : undefined,
				sortBy: query.sortBy,
				sortDir: query.sortDir,
			});
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			query: timeRuleDefinitionListQuerySchema,
			response: {
				200: timeRuleDefinitionListResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "List time rule definitions" },
		},
	)
	.post(
		"/",
		async ({ db, body, set }) => {
			const result = await createDefinition(db, body as CreateDefinitionInput);

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
	.get(
		"/:ruleId",
		async ({ db, params, set }) => {
			const result = await getDefinitionById(db, params.ruleId);
			if (!result) {
				set.status = 404;
				return { ok: false, error: { code: "NOT_FOUND", message: "Definition not found" } };
			}
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			response: {
				200: timeRuleDefinitionResponseSchema,
				404: timeRuleErrorResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "Get time rule definition" },
		},
	)
	.patch(
		"/:ruleId",
		async ({ db, params, body, set }) => {
			const result = await updateDefinition(db, params.ruleId, body as UpdateDefinitionInput);

			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			body: timeRuleDefinitionUpdateSchema,
			response: {
				200: timeRuleDefinitionResponseSchema,
				400: timeRuleErrorResponseSchema,
				404: timeRuleErrorResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "Update time rule definition" },
		},
	)
	.delete(
		"/:ruleId",
		async ({ db, params, set }) => {
			const result = await deleteDefinition(db, params.ruleId);

			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			response: {
				200: t.Object({ ok: t.Boolean(), data: t.Object({ id: t.String() }) }),
				400: timeRuleErrorResponseSchema,
				404: timeRuleErrorResponseSchema,
			},
			detail: { tags: ["MES - Time Rules"], summary: "Delete time rule definition" },
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
