import { Bell, Factory, Microscope, Settings2 } from "lucide-react";
import type React from "react";

export type UserRole = "admin" | "supervisor" | "technician" | "workshop_supervisor" | "operator";

export interface NavItem {
	title: string;
	url: string;
	icon?: React.ElementType;
	isActive?: boolean;
	items?: NavItem[];
	roles?: UserRole[];
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
			},
			{
				title: "批次管理",
				url: "/mes/runs",
			},
			{
				title: "工位执行",
				url: "/mes/execution",
			},
			{
				title: "路由管理",
				url: "/mes/routes",
			},
			{
				title: "路由版本",
				url: "/mes/route-versions",
			},
		],
	},
	{
		title: "仪器计量",
		url: "/instruments",
		icon: Microscope,
		roles: ["admin", "supervisor", "workshop_supervisor", "technician"],
		items: [
			{
				title: "仪器列表",
				url: "/instruments",
			},
			{
				title: "校准记录",
				url: "/calibrations",
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
		roles: ["admin", "supervisor"],
		items: [
			{
				title: "用户管理",
				url: "/system/user-management",
			},
			{
				title: "系统设置",
				url: "/system/settings",
			},
			{
				title: "集成管理",
				url: "/system/integrations",
			},
		],
	},
];
