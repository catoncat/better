import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { completeOqcSchema, createOqcSchema, oqcQuerySchema, recordOqcItemSchema } from "./schema";
import {
	checkOqcGate,
	completeOqc,
	createOqc,
	getOqc,
	getOqcByRun,
	listOqc,
	recordOqcItem,
	startOqc,
} from "./service";

export const oqcRoutes = new Elysia({ prefix: "/oqc" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List OQC inspections
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listOqc(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			query: oqcQuerySchema,
			detail: { tags: ["MES - OQC"], summary: "List OQC inspections" },
		},
	)
	// Get OQC by ID
	.get(
		"/:oqcId",
		async ({ db, params, set }) => {
			const result = await getOqc(db, params.oqcId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			detail: { tags: ["MES - OQC"], summary: "Get OQC by ID" },
		},
	)
	// Get OQC by run
	.get(
		"/run/:runNo",
		async ({ db, params, set }) => {
			const result = await getOqcByRun(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			detail: { tags: ["MES - OQC"], summary: "Get OQC for a run" },
		},
	)
	// Check OQC gate for run
	.get(
		"/run/:runNo/gate",
		async ({ db, params, set }) => {
			const result = await checkOqcGate(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			detail: { tags: ["MES - OQC"], summary: "Check OQC gate for run completion" },
		},
	)
	// Create OQC for run (manual trigger)
	.post(
		"/run/:runNo",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createOqc(db, params.runNo, body, { createdBy: user?.id });
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: params.runNo,
					entityDisplay: `OQC for ${params.runNo}`,
					action: "OQC_CREATE",
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
				entityDisplay: `OQC for ${params.runNo}`,
				action: "OQC_CREATE",
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
			body: createOqcSchema,
			detail: { tags: ["MES - OQC"], summary: "Create OQC task for run" },
		},
	)
	// Start OQC inspection
	.post(
		"/:oqcId/start",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.oqcId },
				include: { items: true },
			});
			const result = await startOqc(db, params.oqcId, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.oqcId),
					entityDisplay: `OQC ${params.oqcId}`,
					action: "OQC_START",
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
				entityDisplay: `OQC ${params.oqcId}`,
				action: "OQC_START",
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
			detail: { tags: ["MES - OQC"], summary: "Start OQC inspection" },
		},
	)
	// Record OQC item
	.post(
		"/:oqcId/items",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.oqcId },
				include: { items: true },
			});
			const result = await recordOqcItem(db, params.oqcId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.oqcId),
					entityDisplay: `OQC ${params.oqcId}`,
					action: "OQC_ITEM_RECORD",
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
				where: { id: params.oqcId },
				include: { items: true },
			});
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSPECTION,
				entityId: params.oqcId,
				entityDisplay: `OQC ${params.oqcId}`,
				action: "OQC_ITEM_RECORD",
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
			requirePermission: Permission.QUALITY_OQC,
			body: recordOqcItemSchema,
			detail: { tags: ["MES - OQC"], summary: "Record OQC inspection item" },
		},
	)
	// Complete OQC
	.post(
		"/:oqcId/complete",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.oqcId },
				include: { items: true, run: { select: { runNo: true, status: true } } },
			});
			const result = await completeOqc(db, params.oqcId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.oqcId),
					entityDisplay: `OQC ${params.oqcId}`,
					action: "OQC_COMPLETE",
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
				entityDisplay: `OQC ${params.oqcId}`,
				action: "OQC_COMPLETE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				payload: body,
				request: meta,
			});

			// Also audit the run status change
			if (before?.run) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: before.run.runNo,
					entityDisplay: `Run ${before.run.runNo}`,
					action: body.decision === "PASS" ? "RUN_COMPLETED" : "RUN_ON_HOLD",
					actor,
					status: "SUCCESS",
					before: { status: before.run.status },
					after: { status: result.data.run.status },
					payload: { oqcId: params.oqcId, oqcDecision: body.decision },
					request: meta,
				});
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			body: completeOqcSchema,
			detail: { tags: ["MES - OQC"], summary: "Complete OQC with decision" },
		},
	);
