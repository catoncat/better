import type { PrismaClient } from "@better-app/db";
import {
	type AppAbility,
	type DataScope,
	defineAbilityFor,
	type RoleDefinition,
	type UserWithPermissions,
} from "@better-app/db";

/**
 * Fetch user with roles and bindings for permission checking
 */
export async function getUserWithPermissions(
	db: PrismaClient,
	userId: string,
): Promise<UserWithPermissions> {
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			userRoles: {
				include: {
					role: true,
				},
			},
			lineBindings: true,
			stationBindings: true,
		},
	});

	if (!user) {
		return {
			id: userId,
			roles: [],
			lineIds: [],
			stationIds: [],
		};
	}

	const roles: RoleDefinition[] = user.userRoles.map((ur) => ({
		code: ur.role.code,
		name: ur.role.name,
		permissions: JSON.parse(ur.role.permissions) as string[],
		dataScope: ur.role.dataScope as DataScope,
	}));

	return {
		id: user.id,
		roles,
		lineIds: user.lineBindings.map((b) => b.lineId),
		stationIds: user.stationBindings.map((b) => b.stationId),
	};
}

/**
 * Build CASL ability for a user
 */
export async function buildAbilityForUser(db: PrismaClient, userId: string): Promise<AppAbility> {
	const userWithPermissions = await getUserWithPermissions(db, userId);
	return defineAbilityFor(userWithPermissions);
}

/**
 * Check if user has any of the required permissions
 */
export async function userHasAnyPermission(
	db: PrismaClient,
	userId: string,
	permissions: string[],
): Promise<boolean> {
	const userWithPermissions = await getUserWithPermissions(db, userId);

	for (const role of userWithPermissions.roles) {
		for (const perm of role.permissions) {
			if (permissions.includes(perm)) {
				return true;
			}
		}
	}

	return false;
}

export { defineAbilityFor, type AppAbility, type UserWithPermissions };
