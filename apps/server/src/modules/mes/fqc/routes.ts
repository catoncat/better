import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	completeFqcSchema,
	createFqcSchema,
	fqcQuerySchema,
	recordFqcItemSchema,
	signFqcSchema,
} from "./schema";
import {
	completeFqc,
	createFqc,
	getFqc,
	getFqcByRun,
	listFqc,
	recordFqcItem,
	signFqc,
	startFqc,
} from "./service";

export const fqcRoutes = new Elysia({ prefix: "/fqc" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List FQC inspections
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listFqc(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			query: fqcQuerySchema,
			detail: { tags: ["MES - FQC"], summary: "List FQC inspections" },
		},
	)
	// Get FQC by ID
	.get(
		"/:fqcId",
		async ({ db, params, set }) => {
			const result = await getFqc(db, params.fqcId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FQC"], summary: "Get FQC by ID" },
		},
	)
	// Get FQC by run
	.get(
		"/run/:runNo",
		async ({ db, params, set }) => {
			const result = await getFqcByRun(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FQC"], summary: "Get FQC for a run" },
		},
	)
	// Create FQC for run
	.post(
		"/run/:runNo",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createFqc(db, params.runNo, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: params.runNo,
					entityDisplay: `FQC for ${params.runNo}`,
					action: "FQC_CREATE",
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
				entityType: AuditEntityType.INSPECTION,
				entityId: result.data.id,
				entityDisplay: `FQC for ${params.runNo}`,
				action: "FQC_CREATE",
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
			requirePermission: Permission.QUALITY_FAI,
			body: createFqcSchema,
			detail: { tags: ["MES - FQC"], summary: "Create FQC task for run" },
		},
	)
	// Start FQC inspection
	.post(
		"/:fqcId/start",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.fqcId },
				include: { items: true },
			});
			const result = await startFqc(db, params.fqcId, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.fqcId),
					entityDisplay: `FQC ${params.fqcId}`,
					action: "FQC_START",
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
				entityType: AuditEntityType.INSPECTION,
				entityId: result.data.id,
				entityDisplay: `FQC ${params.fqcId}`,
				action: "FQC_START",
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
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FQC"], summary: "Start FQC inspection" },
		},
	)
	// Record FQC item
	.post(
		"/:fqcId/items",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.fqcId },
				include: { items: true },
			});
			const result = await recordFqcItem(db, params.fqcId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.fqcId),
					entityDisplay: `FQC ${params.fqcId}`,
					action: "FQC_ITEM_RECORD",
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
			const after = await db.inspection.findUnique({
				where: { id: params.fqcId },
				include: { items: true },
			});
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSPECTION,
				entityId: params.fqcId,
				entityDisplay: `FQC ${params.fqcId}`,
				action: "FQC_ITEM_RECORD",
				actor,
				status: "SUCCESS",
				before,
				after,
				payload: { ...body, itemId: result.data.itemId },
				request: meta,
			});
			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			body: recordFqcItemSchema,
			detail: { tags: ["MES - FQC"], summary: "Record FQC inspection item" },
		},
	)
	// Complete FQC
	.post(
		"/:fqcId/complete",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.fqcId },
				include: { items: true },
			});
			const result = await completeFqc(db, params.fqcId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.fqcId),
					entityDisplay: `FQC ${params.fqcId}`,
					action: "FQC_COMPLETE",
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
				entityType: AuditEntityType.INSPECTION,
				entityId: result.data.id,
				entityDisplay: `FQC ${params.fqcId}`,
				action: "FQC_COMPLETE",
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
			requirePermission: Permission.QUALITY_FAI,
			body: completeFqcSchema,
			detail: { tags: ["MES - FQC"], summary: "Complete FQC with decision" },
		},
	)
	// Sign FQC
	.post(
		"/:fqcId/sign",
		async ({ db, params, body, set, user, request }) => {
			if (!user?.id) {
				set.status = 401;
				return { ok: false, error: { code: "UNAUTHORIZED", message: "User not authenticated" } };
			}

			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.fqcId },
				include: { items: true },
			});
			const result = await signFqc(db, params.fqcId, body, user.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.fqcId),
					entityDisplay: `FQC ${params.fqcId}`,
					action: "FQC_SIGN",
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
				entityType: AuditEntityType.INSPECTION,
				entityId: result.data.id,
				entityDisplay: `FQC ${params.fqcId}`,
				action: "FQC_SIGN",
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
			requirePermission: Permission.QUALITY_FAI,
			body: signFqcSchema,
			detail: { tags: ["MES - FQC"], summary: "Sign FQC" },
		},
	);
