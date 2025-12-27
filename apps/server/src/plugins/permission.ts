import prisma, { Permission, type PermissionValue } from "@better-app/db";
import { Elysia } from "elysia";
import { type AppAbility, buildAbilityForUser, getUserWithPermissions } from "../lib/permissions";

class ForbiddenError extends Error {
	constructor(message = "Forbidden") {
		super(message);
		this.name = "FORBIDDEN";
	}
}

/**
 * Permission plugin that extends auth with RBAC capabilities
 *
 * Usage:
 * ```typescript
 * app
 *   .use(permissionPlugin)
 *   .get("/protected", ({ ability }) => {
 *     if (ability.can("read", "WorkOrder")) {
 *       // ...
 *     }
 *   }, { isAuth: true, loadAbility: true })
 *
 *   // Or with required permission check
 *   .get("/admin-only", handler, {
 *     isAuth: true,
 *     requirePermission: "system:user_manage"
 *   })
 * ```
 */
export const permissionPlugin = new Elysia({
	name: "permission",
})
	.error({
		FORBIDDEN: ForbiddenError,
	})
	.macro({
		/**
		 * Load user's CASL ability instance
		 * Requires isAuth to be true (user must exist in context)
		 */
		loadAbility: {
			async resolve(context) {
				const user = (context as { user?: { id: string } }).user;
				if (!user) {
					return { ability: null, userPermissions: null };
				}

				const userWithPermissions = await getUserWithPermissions(prisma, user.id);
				const ability = await buildAbilityForUser(prisma, user.id);

				return {
					ability,
					userPermissions: userWithPermissions,
				};
			},
		},

		/**
		 * Require a specific permission
		 * Will throw ForbiddenError if user doesn't have the permission
		 */
		requirePermission: (permission: PermissionValue | PermissionValue[]) => ({
			async resolve(context) {
				const user = (context as { user?: { id: string } }).user;
				if (!user) {
					throw new ForbiddenError("Not authenticated");
				}

				const userWithPermissions = await getUserWithPermissions(prisma, user.id);
				const permissions = Array.isArray(permission) ? permission : [permission];

				// Check if user has any of the required permissions
				let hasPermission = false;
				for (const role of userWithPermissions.roles) {
					for (const perm of role.permissions) {
						if (permissions.includes(perm as PermissionValue)) {
							hasPermission = true;
							break;
						}
					}
					if (hasPermission) break;
				}

				if (!hasPermission) {
					throw new ForbiddenError(`Missing required permission: ${permissions.join(" or ")}`);
				}

				const ability = await buildAbilityForUser(prisma, user.id);

				return {
					ability,
					userPermissions: userWithPermissions,
				};
			},
		}),
	})
	.onError(({ code, set, error }) => {
		if (code === "FORBIDDEN") {
			set.status = 403;
			return {
				code: "FORBIDDEN",
				message: error.message,
			};
		}
	});

// Re-export Permission constants for convenience
export { Permission };
export type { AppAbility };
