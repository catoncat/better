import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	createSamplingRule,
	deleteSamplingRule,
	getSamplingRule,
	listSamplingRules,
	updateSamplingRule,
} from "./sampling-rule-service";
import {
	createSamplingRuleSchema,
	samplingRuleQuerySchema,
	updateSamplingRuleSchema,
} from "./schema";

export const samplingRuleRoutes = new Elysia({ prefix: "/oqc/sampling-rules" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List sampling rules
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listSamplingRules(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			query: samplingRuleQuerySchema,
			detail: { tags: ["MES - OQC Sampling Rules"], summary: "List OQC sampling rules" },
		},
	)
	// Get sampling rule by ID
	.get(
		"/:ruleId",
		async ({ db, params, set }) => {
			const result = await getSamplingRule(db, params.ruleId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			detail: { tags: ["MES - OQC Sampling Rules"], summary: "Get sampling rule by ID" },
		},
	)
	// Create sampling rule
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createSamplingRule(db, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "oqc-sampling-rule",
					entityDisplay: "OQC Sampling Rule",
					action: "SAMPLING_RULE_CREATE",
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
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `OQC Sampling Rule ${result.data.id}`,
				action: "SAMPLING_RULE_CREATE",
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
			requirePermission: Permission.QUALITY_OQC,
			body: createSamplingRuleSchema,
			detail: { tags: ["MES - OQC Sampling Rules"], summary: "Create OQC sampling rule" },
		},
	)
	// Update sampling rule
	.patch(
		"/:ruleId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.oqcSamplingRule.findUnique({
				where: { id: params.ruleId },
			});
			const result = await updateSamplingRule(db, params.ruleId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.ruleId,
					entityDisplay: `OQC Sampling Rule ${params.ruleId}`,
					action: "SAMPLING_RULE_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `OQC Sampling Rule ${result.data.id}`,
				action: "SAMPLING_RULE_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				payload: body,
				request: meta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			body: updateSamplingRuleSchema,
			detail: { tags: ["MES - OQC Sampling Rules"], summary: "Update OQC sampling rule" },
		},
	)
	// Delete (deactivate) sampling rule
	.delete(
		"/:ruleId",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.oqcSamplingRule.findUnique({
				where: { id: params.ruleId },
			});
			const result = await deleteSamplingRule(db, params.ruleId);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.ruleId,
					entityDisplay: `OQC Sampling Rule ${params.ruleId}`,
					action: "SAMPLING_RULE_DELETE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: params.ruleId,
				entityDisplay: `OQC Sampling Rule ${params.ruleId}`,
				action: "SAMPLING_RULE_DELETE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: meta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			detail: {
				tags: ["MES - OQC Sampling Rules"],
				summary: "Delete (deactivate) OQC sampling rule",
			},
		},
	);
