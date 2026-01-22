import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";

export const metaModule = new Elysia({
	prefix: "/meta",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/roles",
		async ({ db }) => {
			const roles = await db.role.findMany({
				select: {
					id: true,
					code: true,
					name: true,
					dataScope: true,
				},
				orderBy: [{ isSystem: "desc" }, { code: "asc" }],
			});
			return {
				ok: true,
				data: {
					roles,
				},
			};
		},
		{
			isAuth: true,
			detail: { summary: "List available user roles", tags: ["Meta"] },
			response: t.Object({
				ok: t.Boolean(),
				data: t.Object({
					roles: t.Array(
						t.Object({
							id: t.String(),
							code: t.String(),
							name: t.String(),
							dataScope: t.Union([
								t.Literal("ALL"),
								t.Literal("ASSIGNED_LINES"),
								t.Literal("ASSIGNED_STATIONS"),
							]),
						}),
					),
				}),
			}),
		},
	);
