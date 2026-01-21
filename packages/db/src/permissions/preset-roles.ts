import type { DataScope, RoleDefinition } from "./ability";
import { Permission } from "./permissions";

interface PresetRole extends RoleDefinition {
	description: string;
	isSystem: true;
}

/**
 * System preset roles - cannot be deleted, but name/description can be edited
 */
export const PRESET_ROLES: PresetRole[] = [
	{
		code: "admin",
		name: "系统管理员",
		description: "系统配置、用户管理、集成管理",
		permissions: [
			Permission.SYSTEM_USER_MANAGE,
			Permission.SYSTEM_ROLE_MANAGE,
			Permission.SYSTEM_CONFIG,
			Permission.SYSTEM_INTEGRATION,
			Permission.DATA_SPEC_CONFIG,
			Permission.LINE_CONFIG,
			// Admin can also view everything
			Permission.WO_READ,
			Permission.RUN_READ,
			Permission.ROUTE_READ,
			Permission.TRACE_READ,
			Permission.EXEC_READ,
			Permission.READINESS_VIEW,
			Permission.LOADING_VIEW,
		],
		dataScope: "ALL" as DataScope,
		isSystem: true,
	},
	{
		code: "planner",
		name: "生产计划员",
		description: "工单接收/发布、批次创建、进度跟踪",
		permissions: [
			Permission.WO_READ,
			Permission.WO_RECEIVE,
			Permission.WO_RELEASE,
			Permission.WO_UPDATE,
			Permission.WO_CLOSE,
			Permission.RUN_READ,
			Permission.RUN_CREATE,
			Permission.ROUTE_READ,
			Permission.TRACE_READ,
		],
		dataScope: "ALL" as DataScope,
		isSystem: true,
	},
	{
		code: "engineer",
		name: "工艺工程师",
		description: "路由配置、执行语义设置、版本编译",
		permissions: [
			Permission.SYSTEM_INTEGRATION,
			Permission.ROUTE_READ,
			Permission.ROUTE_CONFIGURE,
			Permission.ROUTE_COMPILE,
			Permission.ROUTE_CREATE,
			Permission.DATA_SPEC_CONFIG,
			Permission.OPERATION_CONFIG,
			Permission.WO_READ,
			Permission.RUN_READ,
			Permission.TRACE_READ,
			Permission.READINESS_CONFIG,
			Permission.LOADING_CONFIG,
			Permission.LINE_CONFIG,
		],
		dataScope: "ALL" as DataScope,
		isSystem: true,
	},
	{
		code: "quality",
		name: "质量工程师",
		description: "质量检验、缺陷处置、追溯分析",
		permissions: [
			Permission.QUALITY_FAI,
			Permission.QUALITY_OQC,
			Permission.QUALITY_DISPOSITION,
			Permission.TRACE_READ,
			Permission.TRACE_EXPORT,
			Permission.WO_READ,
			Permission.RUN_READ,
			Permission.EXEC_READ,
			Permission.READINESS_VIEW,
			Permission.READINESS_CHECK,
			Permission.READINESS_OVERRIDE,
		],
		dataScope: "ALL" as DataScope,
		isSystem: true,
	},
	{
		code: "leader",
		name: "产线组长",
		description: "批次授权、产线监控、工位执行",
		permissions: [
			Permission.RUN_READ,
			Permission.RUN_CREATE,
			Permission.RUN_AUTHORIZE,
			Permission.RUN_REVOKE,
			Permission.RUN_CLOSE,
			Permission.EXEC_READ,
			Permission.EXEC_TRACK_IN,
			Permission.EXEC_TRACK_OUT,
			Permission.EXEC_DATA_COLLECT,
			Permission.WO_READ,
			Permission.WO_CLOSE,
			Permission.TRACE_READ,
			Permission.ROUTE_READ,
			Permission.READINESS_VIEW,
			Permission.READINESS_CHECK,
			Permission.READINESS_OVERRIDE,
			Permission.LOADING_VIEW,
			Permission.LOADING_VERIFY,
		],
		dataScope: "ASSIGNED_LINES" as DataScope,
		isSystem: true,
	},
	{
		code: "operator",
		name: "操作员",
		description: "工位进站/出站操作",
		permissions: [
			Permission.EXEC_TRACK_IN,
			Permission.EXEC_TRACK_OUT,
			Permission.TRACE_READ,
			Permission.READINESS_VIEW,
			Permission.LOADING_VIEW,
			Permission.LOADING_VERIFY,
		],
		dataScope: "ASSIGNED_STATIONS" as DataScope,
		isSystem: true,
	},
];

/**
 * Role priority for determining default home page
 * Lower index = higher priority
 */
export const ROLE_PRIORITY = ["admin", "planner", "leader", "engineer", "quality", "operator"];

/**
 * Default home page for each role
 */
export const ROLE_HOME_PAGES: Record<string, string> = {
	admin: "/system/user-management",
	planner: "/mes/work-orders",
	leader: "/mes/runs",
	engineer: "/mes/routes",
	quality: "/mes/trace",
	operator: "/mes/execution",
};

/**
 * Get home page for a user with multiple roles
 * Priority: user preference > role priority
 */
export function getHomePage(
	userPreference: string | null | undefined,
	roleCodes: string[],
): string {
	if (userPreference) {
		return userPreference;
	}

	for (const roleCode of ROLE_PRIORITY) {
		if (roleCodes.includes(roleCode)) {
			return ROLE_HOME_PAGES[roleCode] || "/";
		}
	}

	return "/";
}
