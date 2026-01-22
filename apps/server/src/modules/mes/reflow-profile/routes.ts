import { AuditEntityType } from "@better-app/db";
import Elysia, { t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	reflowProfileCreateSchema,
	reflowProfileListQuerySchema,
	reflowProfileUpdateSchema,
	reflowProfileUsageCreateSchema,
	reflowProfileUsageListQuerySchema,
	verifyProfileSchema,
} from "./schema";
import {
	createReflowProfile,
	createReflowProfileUsage,
	deleteReflowProfile,
	getReflowProfile,
	listReflowProfiles,
	listReflowProfileUsages,
	updateReflowProfile,
	verifyReflowProfile,
} from "./service";

// ==========================================
// ReflowProfile Routes
// ==========================================

export const reflowProfileRoutes = new Elysia({ prefix: "/reflow-profiles" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List profiles
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listReflowProfiles(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			query: reflowProfileListQuerySchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "List reflow profiles",
			},
		},
	)
	// Get single profile
	.get(
		"/:id",
		async ({ db, params, set }) => {
			const result = await getReflowProfile(db, params.id);
			if (!result.success) {
				set.status = result.status ?? 404;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: t.Object({ id: t.String() }),
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Get reflow profile by ID",
			},
		},
	)
	// Create profile
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createReflowProfile(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: body.code,
					entityDisplay: `Reflow profile ${body.code}`,
					action: "REFLOW_PROFILE_CREATE",
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
				entityDisplay: `Reflow profile ${result.data.code}`,
				action: "REFLOW_PROFILE_CREATE",
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
			requirePermission: Permission.ROUTE_CONFIGURE,
			body: reflowProfileCreateSchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Create reflow profile",
			},
		},
	)
	// Update profile
	.patch(
		"/:id",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);

			// Get before state for audit
			const before = await getReflowProfile(db, params.id);
			const result = await updateReflowProfile(db, params.id, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.id,
					entityDisplay: `Reflow profile ${params.id}`,
					action: "REFLOW_PROFILE_UPDATE",
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
				entityDisplay: `Reflow profile ${result.data.code}`,
				action: "REFLOW_PROFILE_UPDATE",
				actor,
				status: "SUCCESS",
				before: before.success ? before.data : undefined,
				after: result.data,
				payload: body,
				request: meta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_CONFIGURE,
			params: t.Object({ id: t.String() }),
			body: reflowProfileUpdateSchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Update reflow profile",
			},
		},
	)
	// Delete profile
	.delete(
		"/:id",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);

			// Get before state for audit
			const before = await getReflowProfile(db, params.id);
			const result = await deleteReflowProfile(db, params.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.id,
					entityDisplay: `Reflow profile ${params.id}`,
					action: "REFLOW_PROFILE_DELETE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: params.id,
				entityDisplay: `Reflow profile ${params.id}`,
				action: "REFLOW_PROFILE_DELETE",
				actor,
				status: "SUCCESS",
				before: before.success ? before.data : undefined,
				request: meta,
			});

			return { ok: true, data: { id: params.id } };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_CONFIGURE,
			params: t.Object({ id: t.String() }),
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Delete reflow profile",
			},
		},
	)
	// Verify profile match
	.post(
		"/verify",
		async ({ db, body, set }) => {
			const result = await verifyReflowProfile(db, body);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			body: verifyProfileSchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Verify if actual program matches expected profile",
			},
		},
	);

// ==========================================
// ReflowProfileUsage Routes
// ==========================================

export const reflowProfileUsageRoutes = new Elysia({
	prefix: "/reflow-profile-usages",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// List usages
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listReflowProfileUsages(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.TRACE_READ,
			query: reflowProfileUsageListQuerySchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "List reflow profile usage records",
			},
		},
	)
	// Create usage record
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createReflowProfileUsage(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: body.runId ?? body.profileId,
					entityDisplay: `Reflow usage for profile ${body.profileId}`,
					action: "REFLOW_USAGE_CREATE",
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
				entityType: AuditEntityType.RUN,
				entityId: result.data.id,
				entityDisplay: `Reflow usage ${result.data.id}`,
				action: "REFLOW_USAGE_CREATE",
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
			requirePermission: Permission.EXEC_TRACK_IN,
			body: reflowProfileUsageCreateSchema,
			detail: {
				tags: ["MES - Reflow Profile"],
				summary: "Create reflow profile usage record",
			},
		},
	);

// Combined routes
export const reflowProfileModuleRoutes = new Elysia()
	.use(reflowProfileRoutes)
	.use(reflowProfileUsageRoutes);
