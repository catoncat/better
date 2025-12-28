import { Elysia } from "elysia";
import { getUserWithPermissions } from "../../lib/permissions";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { permissionsErrorResponseSchema, permissionsMeResponseSchema } from "./schema";

export const permissionsModule = new Elysia({
	prefix: "/permissions",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/me",
		async ({ db, user, set }) => {
			const data = await getUserWithPermissions(db, user.id);
			if (!data) {
				set.status = 404;
				return { ok: false, error: { code: "NOT_FOUND", message: "User not found" } };
			}
			return { ok: true, data };
		},
		{
			isAuth: true,
			response: {
				200: permissionsMeResponseSchema,
				404: permissionsErrorResponseSchema,
			},
			detail: { tags: ["Permissions"] },
		},
	);
