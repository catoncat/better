// Permission system exports

export type {
	Actions,
	AppAbility,
	DataScope,
	RoleDefinition,
	Subjects,
	UserWithPermissions,
} from "./ability";
export {
	defineAbilityFor,
	getAllPermissions,
	getEffectiveDataScope,
	hasPermission,
} from "./ability";
export type { PermissionKey, PermissionValue } from "./permissions";
export { ALL_PERMISSIONS, PERMISSION_GROUPS, Permission } from "./permissions";

export {
	getHomePage,
	PRESET_ROLES,
	ROLE_HOME_PAGES,
	ROLE_PRIORITY,
} from "./preset-roles";
