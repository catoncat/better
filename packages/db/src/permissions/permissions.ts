/**
 * MES Permission Points
 *
 * These are the atomic permission units that can be combined into roles.
 * Format: domain:action
 */
export const Permission = {
	// Work Order domain
	WO_READ: "wo:read",
	WO_RECEIVE: "wo:receive",
	WO_RELEASE: "wo:release",
	WO_UPDATE: "wo:update",
	WO_CLOSE: "wo:close",

	// Run (Batch) domain
	RUN_READ: "run:read",
	RUN_CREATE: "run:create",
	RUN_AUTHORIZE: "run:authorize",
	RUN_REVOKE: "run:revoke",
	RUN_CLOSE: "run:close",

	// Execution domain
	EXEC_READ: "exec:read",
	EXEC_TRACK_IN: "exec:track_in",
	EXEC_TRACK_OUT: "exec:track_out",
	EXEC_DATA_COLLECT: "exec:data_collect",

	// Data Collection Specs domain (config)
	DATA_SPEC_READ: "data_spec:read",
	DATA_SPEC_CONFIG: "data_spec:config",

	// Operation domain (MES-Native operations)
	OPERATION_READ: "operation:read",
	OPERATION_CONFIG: "operation:config",

	// Routing domain
	ROUTE_READ: "route:read",
	ROUTE_CONFIGURE: "route:configure",
	ROUTE_COMPILE: "route:compile",
	ROUTE_CREATE: "route:create",

	// Quality domain (M2)
	QUALITY_FAI: "quality:fai",
	QUALITY_OQC: "quality:oqc",
	QUALITY_DISPOSITION: "quality:disposition",

	// Readiness domain (M2)
	READINESS_VIEW: "readiness:view",
	READINESS_CHECK: "readiness:check",
	READINESS_OVERRIDE: "readiness:override",
	READINESS_CONFIG: "readiness:config",

	// Loading domain (M2)
	LOADING_VIEW: "loading:view",
	LOADING_VERIFY: "loading:verify",
	LOADING_CONFIG: "loading:config",

	// Trace domain
	TRACE_READ: "trace:read",
	TRACE_EXPORT: "trace:export",

	// System domain
	SYSTEM_USER_MANAGE: "system:user_manage",
	SYSTEM_ROLE_MANAGE: "system:role_manage",
	SYSTEM_CONFIG: "system:config",
	SYSTEM_INTEGRATION: "system:integration",
} as const;

export type PermissionKey = keyof typeof Permission;
export type PermissionValue = (typeof Permission)[PermissionKey];

/** All permission values as array */
export const ALL_PERMISSIONS = Object.values(Permission);

/** Permission grouped by domain for UI display */
export const PERMISSION_GROUPS = {
	wo: {
		label: "工单管理",
		permissions: [
			{ value: Permission.WO_READ, label: "查看工单" },
			{ value: Permission.WO_RECEIVE, label: "接收工单" },
			{ value: Permission.WO_RELEASE, label: "发布工单" },
			{ value: Permission.WO_UPDATE, label: "更新工单" },
			{ value: Permission.WO_CLOSE, label: "关闭工单" },
		],
	},
	run: {
		label: "批次管理",
		permissions: [
			{ value: Permission.RUN_READ, label: "查看批次" },
			{ value: Permission.RUN_CREATE, label: "创建批次" },
			{ value: Permission.RUN_AUTHORIZE, label: "授权批次" },
			{ value: Permission.RUN_REVOKE, label: "撤销授权" },
			{ value: Permission.RUN_CLOSE, label: "关闭批次" },
		],
	},
	exec: {
		label: "工位执行",
		permissions: [
			{ value: Permission.EXEC_READ, label: "查看执行" },
			{ value: Permission.EXEC_TRACK_IN, label: "进站操作" },
			{ value: Permission.EXEC_TRACK_OUT, label: "出站操作" },
			{ value: Permission.EXEC_DATA_COLLECT, label: "数据采集" },
		],
	},
	data_spec: {
		label: "数据采集配置",
		permissions: [
			{ value: Permission.DATA_SPEC_READ, label: "查看采集项" },
			{ value: Permission.DATA_SPEC_CONFIG, label: "管理采集项" },
		],
	},
	operation: {
		label: "工序管理",
		permissions: [
			{ value: Permission.OPERATION_READ, label: "查看工序" },
			{ value: Permission.OPERATION_CONFIG, label: "管理工序" },
		],
	},
	route: {
		label: "路由管理",
		permissions: [
			{ value: Permission.ROUTE_READ, label: "查看路由" },
			{ value: Permission.ROUTE_CONFIGURE, label: "配置路由" },
			{ value: Permission.ROUTE_COMPILE, label: "编译路由" },
			{ value: Permission.ROUTE_CREATE, label: "创建路由" },
		],
	},
	quality: {
		label: "质量管理",
		permissions: [
			{ value: Permission.QUALITY_FAI, label: "首件检验" },
			{ value: Permission.QUALITY_OQC, label: "出货检验" },
			{ value: Permission.QUALITY_DISPOSITION, label: "缺陷处置" },
		],
	},
	readiness: {
		label: "准备检查",
		permissions: [
			{ value: Permission.READINESS_VIEW, label: "查看检查结果" },
			{ value: Permission.READINESS_CHECK, label: "执行准备检查" },
			{ value: Permission.READINESS_OVERRIDE, label: "豁免检查项" },
			{ value: Permission.READINESS_CONFIG, label: "管理检查配置" },
		],
	},
	loading: {
		label: "上料管理",
		permissions: [
			{ value: Permission.LOADING_VIEW, label: "查看上料记录" },
			{ value: Permission.LOADING_VERIFY, label: "执行上料验证" },
			{ value: Permission.LOADING_CONFIG, label: "管理站位配置" },
		],
	},
	trace: {
		label: "追溯查询",
		permissions: [
			{ value: Permission.TRACE_READ, label: "追溯查询" },
			{ value: Permission.TRACE_EXPORT, label: "导出报告" },
		],
	},
	system: {
		label: "系统管理",
		permissions: [
			{ value: Permission.SYSTEM_USER_MANAGE, label: "用户管理" },
			{ value: Permission.SYSTEM_ROLE_MANAGE, label: "角色管理" },
			{ value: Permission.SYSTEM_CONFIG, label: "系统配置" },
			{ value: Permission.SYSTEM_INTEGRATION, label: "集成管理" },
		],
	},
} as const;
