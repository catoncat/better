/**
 * Route context mapping for the chat assistant
 * Maps route paths to human-readable page names
 */

export type RouteContext = {
	name: string;
	description: string;
};

const routeContextMap: Record<string, RouteContext> = {
	// Dashboard
	"/": { name: "仪表盘", description: "系统首页" },

	// MES
	"/mes": { name: "MES 模块", description: "制造执行系统" },
	"/mes/work-orders": { name: "工单管理", description: "管理生产工单" },
	"/mes/runs": { name: "批次管理", description: "管理生产批次" },
	"/mes/loading": { name: "上料验证", description: "SMT/DIP 上料验证" },
	"/mes/fai": { name: "首件检验", description: "FAI 检验" },
	"/mes/execution": { name: "工位执行", description: "工位级生产执行" },
	"/mes/routes": { name: "路由管理", description: "生产路由配置" },
	"/mes/lines": { name: "产线管理", description: "产线和工位配置" },
	"/mes/materials": { name: "物料管理", description: "物料主数据" },
	"/mes/products": { name: "产品管理", description: "产品和 BOM" },

	// System
	"/system": { name: "系统管理", description: "系统配置" },
	"/system/users": { name: "用户管理", description: "用户和权限" },
	"/system/audit-logs": { name: "审计日志", description: "操作日志" },
	"/system/settings": { name: "系统设置", description: "系统参数" },

	// Profile
	"/profile": { name: "个人资料", description: "个人账户信息" },
};

/**
 * Get context for the current route
 */
export function getRouteContext(pathname: string): RouteContext {
	// Direct match
	if (routeContextMap[pathname]) {
		return routeContextMap[pathname];
	}

	// Try prefix matching (for dynamic routes)
	for (const [route, context] of Object.entries(routeContextMap)) {
		if (pathname.startsWith(route) && route !== "/") {
			return context;
		}
	}

	return { name: "当前页面", description: "" };
}
