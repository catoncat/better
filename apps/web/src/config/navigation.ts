import { Permission, type PermissionValue } from "@better-app/db/permissions";
import { Bell, Factory, Settings2 } from "lucide-react";
import type React from "react";

export interface NavItem {
	title: string;
	url: string;
	icon?: React.ElementType;
	isActive?: boolean;
	items?: NavItem[];
	permissions?: PermissionValue[];
	permissionMode?: "any" | "all";
}

export const navMain: NavItem[] = [
	{
		title: "生产执行",
		url: "/mes",
		icon: Factory,
		items: [
			{
				title: "工单管理",
				url: "/mes/work-orders",
				permissions: [Permission.WO_READ],
			},
			{
				title: "批次管理",
				url: "/mes/runs",
				permissions: [Permission.RUN_READ],
			},
			{
				title: "准备异常",
				url: "/mes/readiness-exceptions",
				permissions: [Permission.READINESS_VIEW],
			},
			{
				title: "上料防错",
				url: "/mes/loading",
				permissions: [Permission.LOADING_VERIFY, Permission.LOADING_VIEW],
				permissionMode: "any",
			},
			{
				title: "首件检验",
				url: "/mes/fai",
				permissions: [Permission.QUALITY_FAI],
			},
			{
				title: "出货检验",
				url: "/mes/oqc",
				permissions: [Permission.QUALITY_OQC],
			},
			{
				title: "OQC 规则",
				url: "/mes/oqc/rules",
				permissions: [Permission.QUALITY_OQC],
			},
			{
				title: "缺陷处置",
				url: "/mes/defects",
				permissions: [Permission.QUALITY_DISPOSITION],
			},
			{
				title: "返工任务",
				url: "/mes/rework-tasks",
				permissions: [Permission.QUALITY_DISPOSITION],
			},
			{
				title: "工位执行",
				url: "/mes/execution",
				permissions: [Permission.EXEC_READ, Permission.EXEC_TRACK_IN, Permission.EXEC_TRACK_OUT],
				permissionMode: "any",
			},
			{
				title: "路由管理",
				url: "/mes/routes",
				permissions: [Permission.ROUTE_READ],
			},
			{
				title: "路由版本",
				url: "/mes/route-versions",
				permissions: [Permission.ROUTE_READ],
			},
			{
				title: "追溯查询",
				url: "/mes/trace",
				permissions: [Permission.TRACE_READ],
			},
		],
	},
	{
		title: "通知中心",
		url: "/notifications",
		icon: Bell,
	},

	{
		title: "系统管理",
		url: "/system",
		icon: Settings2,
		permissions: [Permission.SYSTEM_USER_MANAGE, Permission.SYSTEM_ROLE_MANAGE],
		permissionMode: "any",
		items: [
			{
				title: "用户管理",
				url: "/system/user-management",
				permissions: [Permission.SYSTEM_USER_MANAGE],
			},
			{
				title: "角色管理",
				url: "/system/role-management",
				permissions: [Permission.SYSTEM_ROLE_MANAGE],
			},
			{
				title: "系统设置",
				url: "/system/settings",
				permissions: [Permission.SYSTEM_CONFIG],
			},
			{
				title: "集成管理",
				url: "/system/integrations",
				permissions: [Permission.SYSTEM_INTEGRATION],
			},
		],
	},
];
