import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { completeFaiSchema, createFaiSchema, faiQuerySchema, recordFaiItemSchema } from "./schema";
import {
	checkFaiGate,
	completeFai,
	createFai,
	getFai,
	getFaiByRun,
	listFai,
	recordFaiItem,
	startFai,
} from "./service";

export const faiRoutes = new Elysia({ prefix: "/fai" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List FAI inspections
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listFai(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			query: faiQuerySchema,
			detail: { tags: ["MES - FAI"], summary: "List FAI inspections" },
		},
	)
	// Get FAI by ID
	.get(
		"/:faiId",
		async ({ db, params, set }) => {
			const result = await getFai(db, params.faiId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FAI"], summary: "Get FAI by ID" },
		},
	)
	// Get FAI by run
	.get(
		"/run/:runNo",
		async ({ db, params, set }) => {
			const result = await getFaiByRun(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FAI"], summary: "Get FAI for a run" },
		},
	)
	// Check FAI gate for run
	.get(
		"/run/:runNo/gate",
		async ({ db, params, set }) => {
			const result = await checkFaiGate(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_FAI,
			detail: { tags: ["MES - FAI"], summary: "Check FAI gate for run authorization" },
		},
	)
	// Create FAI for run
	.post(
		"/run/:runNo",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createFai(db, params.runNo, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: params.runNo,
					entityDisplay: `FAI for ${params.runNo}`,
					action: "FAI_CREATE",
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
				entityDisplay: `FAI for ${params.runNo}`,
				action: "FAI_CREATE",
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
			body: createFaiSchema,
			detail: { tags: ["MES - FAI"], summary: "Create FAI task for run" },
		},
	)
	// Start FAI inspection
	.post(
		"/:faiId/start",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.faiId },
				include: { items: true },
			});
			const result = await startFai(db, params.faiId, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.faiId),
					entityDisplay: `FAI ${params.faiId}`,
					action: "FAI_START",
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
				entityDisplay: `FAI ${params.faiId}`,
				action: "FAI_START",
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
			detail: { tags: ["MES - FAI"], summary: "Start FAI inspection" },
		},
	)
	// Record FAI item
	.post(
		"/:faiId/items",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.faiId },
				include: { items: true },
			});
			const result = await recordFaiItem(db, params.faiId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.faiId),
					entityDisplay: `FAI ${params.faiId}`,
					action: "FAI_ITEM_RECORD",
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
				where: { id: params.faiId },
				include: { items: true },
			});
			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSPECTION,
				entityId: params.faiId,
				entityDisplay: `FAI ${params.faiId}`,
				action: "FAI_ITEM_RECORD",
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
			body: recordFaiItemSchema,
			detail: { tags: ["MES - FAI"], summary: "Record FAI inspection item" },
		},
	)
	// Complete FAI
	.post(
		"/:faiId/complete",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const before = await db.inspection.findUnique({
				where: { id: params.faiId },
				include: { items: true },
			});
			const result = await completeFai(db, params.faiId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSPECTION,
					entityId: String(before?.id ?? params.faiId),
					entityDisplay: `FAI ${params.faiId}`,
					action: "FAI_COMPLETE",
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
				entityDisplay: `FAI ${params.faiId}`,
				action: "FAI_COMPLETE",
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
			body: completeFaiSchema,
			detail: { tags: ["MES - FAI"], summary: "Complete FAI with decision" },
		},
	);
