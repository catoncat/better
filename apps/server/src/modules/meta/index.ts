import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { UserRole } from "../../types/prisma-enums";

export const metaModule = new Elysia({
	prefix: "/meta",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/roles",
		() => ({
			ok: true,
			data: {
				roles: Object.values(UserRole),
			},
		}),
		{
			isAuth: true,
			detail: { summary: "List available user roles", tags: ["Meta"] },
			response: t.Object({
				ok: t.Boolean(),
				data: t.Object({
					roles: t.Array(t.Enum(UserRole)),
				}),
			}),
		},
	);