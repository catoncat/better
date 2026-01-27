import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	assignDispositionSchema,
	completeReworkSchema,
	createDefectSchema,
	defectQuerySchema,
	releaseHoldSchema,
	repairRecordSchema,
	reworkTaskQuerySchema,
} from "./schema";
import {
	assignDisposition,
	completeRework,
	createDefect,
	getDefect,
	listDefects,
	listReworkTasks,
	releaseHold,
	saveRepairRecord,
} from "./service";

const defectInclude = {
	unit: true,
	track: { include: { station: true } },
	disposition: { include: { reworkTask: true } },
};

export const defectRoutes = new Elysia({ prefix: "/defects" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List defects
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listDefects(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			query: defectQuerySchema,
			detail: { tags: ["MES - Defect"], summary: "List defects" },
		},
	)
	// Get defect by ID
	.get(
		"/:defectId",
		async ({ db, params, set }) => {
			const result = await getDefect(db, params.defectId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			detail: { tags: ["MES - Defect"], summary: "Get defect by ID" },
		},
	)
	// Create defect
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createDefect(db, body, undefined, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DEFECT,
					entityId: body.unitSn,
					entityDisplay: `Defect for ${body.unitSn}`,
					action: "DEFECT_CREATE",
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
				entityType: AuditEntityType.DEFECT,
				entityId: result.data.id,
				entityDisplay: `Defect ${result.data.code}`,
				action: "DEFECT_CREATE",
				actor,
				status: "SUCCESS",
				before: null,
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: createDefectSchema,
			detail: { tags: ["MES - Defect"], summary: "Create defect" },
		},
	)
	// Assign disposition
	.post(
		"/:defectId/disposition",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.defect.findUnique({
				where: { id: params.defectId },
				include: defectInclude,
			});
			const result = await assignDisposition(db, params.defectId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DEFECT,
					entityId: String(before?.id ?? params.defectId),
					entityDisplay: `Defect ${params.defectId}`,
					action: "DEFECT_DISPOSITION_ASSIGN",
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
				entityType: AuditEntityType.DEFECT,
				entityId: result.data.id,
				entityDisplay: `Defect ${result.data.code}`,
				action: "DEFECT_DISPOSITION_ASSIGN",
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
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: assignDispositionSchema,
			detail: { tags: ["MES - Defect"], summary: "Assign disposition to defect" },
		},
	)
	// Release hold
	.post(
		"/:defectId/release",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.defect.findUnique({
				where: { id: params.defectId },
				include: defectInclude,
			});
			const result = await releaseHold(db, params.defectId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DEFECT,
					entityId: String(before?.id ?? params.defectId),
					entityDisplay: `Defect ${params.defectId}`,
					action: "DEFECT_RELEASE_HOLD",
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
				entityType: AuditEntityType.DEFECT,
				entityId: result.data.id,
				entityDisplay: `Defect ${result.data.code}`,
				action: "DEFECT_RELEASE_HOLD",
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
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: releaseHoldSchema,
			detail: { tags: ["MES - Defect"], summary: "Release unit from ON_HOLD" },
		},
	);

export const reworkRoutes = new Elysia({ prefix: "/rework-tasks" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List rework tasks
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listReworkTasks(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			query: reworkTaskQuerySchema,
			detail: { tags: ["MES - Rework"], summary: "List rework tasks" },
		},
	)
	// Record repair details (QR-Pro-012)
	.post(
		"/:taskId/repair-record",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeTask = await db.reworkTask.findUnique({
				where: { id: params.taskId },
				include: { unit: true, disposition: { include: { defect: true } } },
			});
			const beforeDefect = beforeTask?.disposition.defect ?? null;
			const result = await saveRepairRecord(db, params.taskId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DEFECT,
					entityId: String(beforeDefect?.id ?? params.taskId),
					entityDisplay: `Defect ${beforeDefect?.id ?? params.taskId}`,
					action: "REPAIR_RECORD_UPSERT",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before: beforeTask,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.DEFECT,
				entityId: result.data.disposition.defect.id,
				entityDisplay: `Defect ${result.data.disposition.defect.id}`,
				action: "REPAIR_RECORD_UPSERT",
				actor,
				status: "SUCCESS",
				before: beforeTask,
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: repairRecordSchema,
			detail: { tags: ["MES - Rework"], summary: "Record repair details for rework task" },
		},
	)
	// Complete rework task
	.post(
		"/:taskId/complete",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeTask = await db.reworkTask.findUnique({
				where: { id: params.taskId },
				include: { unit: true, disposition: { include: { defect: true } } },
			});
			const beforeDefect = beforeTask?.disposition.defect ?? null;
			const result = await completeRework(db, params.taskId, body, user?.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DEFECT,
					entityId: String(beforeDefect?.id ?? params.taskId),
					entityDisplay: `Defect ${beforeDefect?.id ?? params.taskId}`,
					action: "REWORK_COMPLETE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before: beforeDefect ?? beforeTask,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.DEFECT,
				entityId: result.data.disposition.defect.id,
				entityDisplay: `Defect ${result.data.disposition.defect.id}`,
				action: "REWORK_COMPLETE",
				actor,
				status: "SUCCESS",
				before: beforeDefect ?? beforeTask,
				after: result.data.disposition.defect,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: completeReworkSchema,
			detail: { tags: ["MES - Rework"], summary: "Complete rework task" },
		},
	);
