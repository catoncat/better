import { AuditEntityType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	faiTemplateCreateSchema,
	faiTemplateErrorResponseSchema,
	faiTemplateIdParamsSchema,
	faiTemplateListQuerySchema,
	faiTemplateListResponseSchema,
	faiTemplateResponseSchema,
	faiTemplateUpdateSchema,
} from "./schema";
import {
	createFaiTemplate,
	getFaiTemplate,
	listFaiTemplates,
	updateFaiTemplate,
} from "./service";

export const faiTemplateModule = new Elysia({
	prefix: "/fai-templates",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listFaiTemplates(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			query: faiTemplateListQuerySchema,
			response: faiTemplateListResponseSchema,
			detail: { tags: ["MES - FAI"], summary: "List FAI templates" },
		},
	)
	.get(
		"/:templateId",
		async ({ db, params, set }) => {
			const result = await getFaiTemplate(db, params.templateId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			params: faiTemplateIdParamsSchema,
			response: {
				200: faiTemplateResponseSchema,
				400: faiTemplateErrorResponseSchema,
				404: faiTemplateErrorResponseSchema,
			},
			detail: { tags: ["MES - FAI"], summary: "Get FAI template" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createFaiTemplate(db, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: body.code,
					entityDisplay: body.name,
					action: "FAI_TEMPLATE_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: result.data.code,
				action: "FAI_TEMPLATE_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: requestMeta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			body: faiTemplateCreateSchema,
			response: {
				201: faiTemplateResponseSchema,
				400: faiTemplateErrorResponseSchema,
				404: faiTemplateErrorResponseSchema,
				409: faiTemplateErrorResponseSchema,
			},
			detail: { tags: ["MES - FAI"], summary: "Create FAI template" },
		},
	)
	.patch(
		"/:templateId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.faiTemplate.findUnique({
				where: { id: params.templateId },
				include: { items: true },
			});

			const result = await updateFaiTemplate(db, params.templateId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.templateId,
					entityDisplay: before?.code ?? params.templateId,
					action: "FAI_TEMPLATE_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					payload: body,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: result.data.code,
				action: "FAI_TEMPLATE_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				payload: body,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			params: faiTemplateIdParamsSchema,
			body: faiTemplateUpdateSchema,
			response: {
				200: faiTemplateResponseSchema,
				400: faiTemplateErrorResponseSchema,
				404: faiTemplateErrorResponseSchema,
				409: faiTemplateErrorResponseSchema,
			},
			detail: { tags: ["MES - FAI"], summary: "Update FAI template" },
		},
	);
