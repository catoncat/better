import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { Permission, permissionPlugin } from "../../plugins/permission";
import { prismaPlugin } from "../../plugins/prisma";
import { AuditEntityType } from "../../types/prisma-enums";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
import {
	changePasswordSchema,
	successResponseSchema,
	userCreateResponseSchema,
	userCreateSchema,
	userErrorResponseSchema,
	userListQuerySchema,
	userListResponseSchema,
	userParamsSchema,
	userProfileUpdateSchema,
	userResponseSchema,
	userUpdateSchema,
} from "./schema";
import {
	changePassword,
	createUser,
	getUserProfile,
	listUsers,
	updateUser,
	updateUserProfile,
} from "./service";

export const usersModule = new Elysia({
	prefix: "/users",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ query, db, set }) => {
			const result = await listUsers(db, query);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_USER_MANAGE,
			query: userListQuerySchema,
			response: {
				200: userListResponseSchema,
				400: userErrorResponseSchema,
			},
			detail: { tags: ["Users"] },
		},
	)
	.post(
		"/",
		async ({ body, db, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await createUser(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: body.email,
					entityDisplay: body.email,
					action: "USER_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
				});
				set.status = result.status ?? 500;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.USER,
				entityId: result.data.id,
				entityDisplay: result.data.email,
				action: "USER_CREATE",
				actor,
				status: "SUCCESS",
				before: null,
				after: result.data,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_USER_MANAGE,
			body: userCreateSchema,
			response: {
				200: userCreateResponseSchema,
				403: userErrorResponseSchema,
				409: userErrorResponseSchema,
				500: userErrorResponseSchema,
			},
			detail: { tags: ["Users"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, db, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const beforeResult = await getUserProfile(db, params.id);
			const before = beforeResult.success ? beforeResult.data : null;

			const result = await updateUser(db, params.id, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: params.id,
					entityDisplay: params.id,
					action: "USER_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 500;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.USER,
				entityId: result.data.id,
				entityDisplay: result.data.email,
				action: "USER_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_USER_MANAGE,
			params: userParamsSchema,
			body: userUpdateSchema,
			response: {
				200: userResponseSchema,
				403: userErrorResponseSchema,
				404: userErrorResponseSchema,
				409: userErrorResponseSchema,
				500: userErrorResponseSchema,
			},
			detail: { tags: ["Users"] },
		},
	)
	.get(
		"/me",
		async ({ user, db, set }) => {
			const result = await getUserProfile(db, user.id);
			if (!result.success) {
				set.status = result.status ?? 404;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			response: {
				200: userResponseSchema,
				404: userErrorResponseSchema,
			},
			detail: { tags: ["Users - Self"] },
		},
	)
	.patch(
		"/me",
		async ({ user, db, body, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const beforeResult = await getUserProfile(db, user.id);
			const before = beforeResult.success ? beforeResult.data : null;

			const result = await updateUserProfile(db, user.id, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: user.id,
					entityDisplay: user.id,
					action: "USER_PROFILE_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 500;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.USER,
				entityId: result.data.id,
				entityDisplay: result.data.email,
				action: "USER_PROFILE_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			body: userProfileUpdateSchema,
			response: {
				200: userResponseSchema,
				404: userErrorResponseSchema,
				409: userErrorResponseSchema,
				500: userErrorResponseSchema,
			},
			detail: { tags: ["Users - Self"] },
		},
	)
	.post(
		"/me/change-password",
		async ({ request, body, db, user, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			const result = await changePassword(db, user.id, body, request.headers);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: user.id,
					entityDisplay: user.email ?? user.id,
					action: "USER_PASSWORD_CHANGE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.USER,
				entityId: user.id,
				entityDisplay: user.email ?? user.id,
				action: "USER_PASSWORD_CHANGE",
				actor,
				status: "SUCCESS",
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			body: changePasswordSchema,
			response: {
				200: successResponseSchema,
				400: userErrorResponseSchema,
				404: userErrorResponseSchema,
			},
			detail: { tags: ["Users - Self"] },
		},
	);
