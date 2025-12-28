import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { Permission, permissionPlugin } from "../../plugins/permission";
import { prismaPlugin } from "../../plugins/prisma";
import {
	roleCreateSchema,
	roleErrorResponseSchema,
	roleListResponseSchema,
	roleParamsSchema,
	roleResponseSchema,
	roleUpdateSchema,
} from "./schema";
import { createRole, deleteRole, listRoles, updateRole } from "./service";

export const rolesModule = new Elysia({
	prefix: "/roles",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, set }) => {
			const result = await listRoles(db);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_ROLE_MANAGE,
			response: {
				200: roleListResponseSchema,
				400: roleErrorResponseSchema,
			},
			detail: { tags: ["Roles"] },
		},
	)
	.post(
		"/",
		async ({ db, body, set }) => {
			const result = await createRole(db, body);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_ROLE_MANAGE,
			body: roleCreateSchema,
			response: {
				200: roleResponseSchema,
				400: roleErrorResponseSchema,
				409: roleErrorResponseSchema,
			},
			detail: { tags: ["Roles"] },
		},
	)
	.patch(
		"/:id",
		async ({ db, params, body, set }) => {
			const result = await updateRole(db, params.id, body);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_ROLE_MANAGE,
			params: roleParamsSchema,
			body: roleUpdateSchema,
			response: {
				200: roleResponseSchema,
				400: roleErrorResponseSchema,
				404: roleErrorResponseSchema,
			},
			detail: { tags: ["Roles"] },
		},
	)
	.delete(
		"/:id",
		async ({ db, params, set }) => {
			const result = await deleteRole(db, params.id);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.SYSTEM_ROLE_MANAGE,
			params: roleParamsSchema,
			response: {
				200: t.Object({ ok: t.Boolean(), data: t.Object({ success: t.Boolean() }) }),
				400: roleErrorResponseSchema,
				404: roleErrorResponseSchema,
			},
			detail: { tags: ["Roles"] },
		},
	);
