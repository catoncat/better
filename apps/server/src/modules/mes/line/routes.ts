import { AuditEntityType, type Prisma, ReadinessItemType } from "@better-app/db";
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	errorResponseSchema,
	lineIdParamSchema,
	lineListResponseSchema,
	lineResponseSchema,
	lineUpdateSchema,
	readinessConfigResponseSchema,
	readinessConfigUpdateBodySchema,
} from "./schema";
import { updateLineProcessType } from "./service";

/** All readiness item types - default enabled set */
const ALL_READINESS_TYPES = Object.values(ReadinessItemType);

/** Parse readiness config from line meta JSON */
function parseReadinessConfig(meta: Prisma.JsonValue | null | undefined): {
	enabled: ReadinessItemType[];
} {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return { enabled: ALL_READINESS_TYPES };
	}
	const obj = meta as Prisma.JsonObject;
	const readinessChecks = obj.readinessChecks;
	if (!readinessChecks || typeof readinessChecks !== "object" || Array.isArray(readinessChecks)) {
		return { enabled: ALL_READINESS_TYPES };
	}
	const checksObj = readinessChecks as Prisma.JsonObject;
	const enabled = checksObj.enabled;
	if (!Array.isArray(enabled)) {
		return { enabled: ALL_READINESS_TYPES };
	}
	const validTypes = new Set(ALL_READINESS_TYPES);
	const filtered = enabled.filter(
		(v): v is ReadinessItemType => typeof v === "string" && validTypes.has(v as ReadinessItemType),
	);
	return { enabled: filtered };
}

export const lineModule = new Elysia({
	prefix: "/lines",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db }) => {
			const items = await db.line.findMany({
				select: {
					id: true,
					code: true,
					name: true,
					processType: true,
				},
				orderBy: [{ code: "asc" }],
			});
			return { ok: true, data: { items } };
		},
		{
			isAuth: true,
			requirePermission: [Permission.RUN_CREATE, Permission.RUN_READ],
			response: lineListResponseSchema,
			detail: { tags: ["MES - Lines"] },
		},
	)
	.patch(
		"/:lineId",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.line.findUnique({ where: { id: params.lineId } });

			const result = await updateLineProcessType(db, params.lineId, body.processType);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.lineId,
					entityDisplay: before?.code ?? params.lineId,
					action: "LINE_PROCESS_TYPE_UPDATE",
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
				action: "LINE_PROCESS_TYPE_UPDATE",
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
			requirePermission: Permission.READINESS_CONFIG,
			params: lineIdParamSchema,
			body: lineUpdateSchema,
			response: {
				200: lineResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Lines"] },
		},
	)
	.get(
		"/:lineId/readiness-config",
		async ({ db, params, set }) => {
			const line = await db.line.findUnique({
				where: { id: params.lineId },
				select: { meta: true },
			});

			if (!line) {
				set.status = 404;
				return {
					ok: false as const,
					error: { code: "LINE_NOT_FOUND", message: "Line not found" },
				};
			}

			const config = parseReadinessConfig(line.meta);
			return { ok: true, data: config };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			params: lineIdParamSchema,
			response: {
				200: readinessConfigResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Lines"] },
		},
	)
	.put(
		"/:lineId/readiness-config",
		async ({ db, params, body, set }) => {
			const line = await db.line.findUnique({
				where: { id: params.lineId },
				select: { meta: true },
			});

			if (!line) {
				set.status = 404;
				return {
					ok: false as const,
					error: { code: "LINE_NOT_FOUND", message: "Line not found" },
				};
			}

			// Merge with existing meta
			const existingMeta =
				line.meta && typeof line.meta === "object" && !Array.isArray(line.meta)
					? (line.meta as Prisma.JsonObject)
					: {};

			const newMeta: Prisma.JsonObject = {
				...existingMeta,
				readinessChecks: {
					enabled: body.enabled,
				},
			};

			await db.line.update({
				where: { id: params.lineId },
				data: { meta: newMeta },
			});

			return { ok: true, data: { enabled: body.enabled } };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CONFIG,
			params: lineIdParamSchema,
			body: readinessConfigUpdateBodySchema,
			response: {
				200: readinessConfigResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Lines"] },
		},
	);
