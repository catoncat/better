import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type InferSubjects,
	type MongoAbility,
} from "@casl/ability";
import type { PermissionValue } from "./permissions";

/**
 * CASL Actions - mapped from permission points
 */
export type Actions =
	| "read"
	| "create"
	| "update"
	| "delete"
	| "manage"
	| "receive"
	| "release"
	| "cancel"
	| "authorize"
	| "revoke"
	| "close"
	| "trackIn"
	| "trackOut"
	| "dataCollect"
	| "configure"
	| "compile"
	| "fai"
	| "oqc"
	| "disposition"
	| "export";

/**
 * CASL Subjects - business entities
 */
export type SubjectName =
	| "WorkOrder"
	| "Run"
	| "Execution"
	| "Route"
	| "Trace"
	| "User"
	| "Role"
	| "System";

type RowScoped = {
	lineId?: string;
	stationId?: string;
};

type SubjectEntity =
	| (RowScoped & ForcedSubject<"WorkOrder">)
	| (RowScoped & ForcedSubject<"Run">)
	| (RowScoped & ForcedSubject<"Execution">)
	| (RowScoped & ForcedSubject<"Route">)
	| (RowScoped & ForcedSubject<"Trace">)
	| (RowScoped & ForcedSubject<"User">)
	| (RowScoped & ForcedSubject<"Role">)
	| (RowScoped & ForcedSubject<"System">);

export type Subjects = InferSubjects<SubjectEntity> | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

/**
 * Data scope types for row-level filtering
 */
export type DataScope = "ALL" | "ASSIGNED_LINES" | "ASSIGNED_STATIONS";

/**
 * Role definition (from database)
 */
export interface RoleDefinition {
	code: string;
	name: string;
	permissions: string[];
	dataScope: DataScope;
}

/**
 * User with roles and bindings (for ability building)
 */
export interface UserWithPermissions {
	id: string;
	roles: RoleDefinition[];
	lineIds: string[];
	stationIds: string[];
}

/**
 * Parse permission string into subject and action
 * e.g., "wo:read" -> { subject: "WorkOrder", action: "read" }
 */
function parsePermission(perm: string): { subject: SubjectName; action: Actions } {
	const [domain, action] = perm.split(":") as [string, string];

	const subjectMap: Record<string, SubjectName> = {
		wo: "WorkOrder",
		run: "Run",
		exec: "Execution",
		route: "Route",
		trace: "Trace",
		quality: "Execution", // quality actions apply to execution context
		system: "System",
	};

	const actionMap: Record<string, Actions> = {
		read: "read",
		create: "create",
		update: "update",
		delete: "delete",
		receive: "receive",
		release: "release",
		cancel: "cancel",
		authorize: "authorize",
		revoke: "revoke",
		close: "close",
		track_in: "trackIn",
		track_out: "trackOut",
		data_collect: "dataCollect",
		configure: "configure",
		compile: "compile",
		fai: "fai",
		oqc: "oqc",
		disposition: "disposition",
		export: "export",
		user_manage: "manage",
		role_manage: "manage",
		config: "manage",
		integration: "manage",
	};

	const subject = subjectMap[domain] || "System";
	const parsedAction = actionMap[action] || "read";

	// Special case for system permissions - use specific subjects
	if (domain === "system") {
		if (action === "user_manage") return { subject: "User", action: "manage" };
		if (action === "role_manage") return { subject: "Role", action: "manage" };
		return { subject: "System", action: "manage" };
	}

	return { subject, action: parsedAction };
}

/**
 * Build CASL ability from user's roles and bindings
 *
 * Multi-role merge strategy:
 * - Permission points: Union (if any role has it, user has it)
 * - Data scope: Per-permission evaluation, take widest scope
 */
export function defineAbilityFor(user: UserWithPermissions): AppAbility {
	const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

	for (const role of user.roles) {
		for (const perm of role.permissions) {
			const { subject, action } = parsePermission(perm);

			if (role.dataScope === "ALL") {
				can(action, subject);
			} else if (role.dataScope === "ASSIGNED_LINES") {
				can(action, subject, { lineId: { $in: user.lineIds } });
			} else if (role.dataScope === "ASSIGNED_STATIONS") {
				can(action, subject, { stationId: { $in: user.stationIds } });
			}
		}
	}

	return build();
}

/**
 * Check if user has a specific permission (simplified helper)
 */
export function hasPermission(user: UserWithPermissions, permission: PermissionValue): boolean {
	return user.roles.some((role) => role.permissions.includes(permission));
}

/**
 * Get effective data scope for a specific permission
 * Returns the widest scope among all roles that grant this permission
 */
export function getEffectiveDataScope(
	user: UserWithPermissions,
	permission: PermissionValue,
): {
	scope: DataScope;
	lineIds?: string[];
	stationIds?: string[];
} {
	const rolesWithPerm = user.roles.filter((r) => r.permissions.includes(permission));

	if (rolesWithPerm.length === 0) {
		return { scope: "ASSIGNED_STATIONS", stationIds: [] };
	}

	// Take widest scope: ALL > ASSIGNED_LINES > ASSIGNED_STATIONS
	if (rolesWithPerm.some((r) => r.dataScope === "ALL")) {
		return { scope: "ALL" };
	}

	if (rolesWithPerm.some((r) => r.dataScope === "ASSIGNED_LINES")) {
		return { scope: "ASSIGNED_LINES", lineIds: user.lineIds };
	}

	return { scope: "ASSIGNED_STATIONS", stationIds: user.stationIds };
}

/**
 * Get all permissions for a user (union of all role permissions)
 */
export function getAllPermissions(user: UserWithPermissions): string[] {
	const permissions = new Set<string>();
	for (const role of user.roles) {
		for (const perm of role.permissions) {
			permissions.add(perm);
		}
	}
	return Array.from(permissions);
}

// Re-export permission constants
export { Permission, type PermissionValue } from "./permissions";
