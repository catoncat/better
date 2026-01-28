/**
 * Route context for the chat assistant
 * Provides page name and description for current route
 */

export type RouteContext = {
	name: string;
	description: string;
};

/**
 * Known route contexts - comprehensive mapping for all MES pages
 * More specific routes should be listed first for proper prefix matching
 */
const knownRoutes: Record<string, RouteContext> = {
	// MES module - specific pages (more specific first)
	"/mes/runs/$runNo": { name: "批次详情", description: "页面：批次详情" },
	"/mes/routes/$routingCode": { name: "路由详情", description: "页面：路由详情" },
	"/mes/loading/slot-config": { name: "站位表配置", description: "页面：站位表配置" },
	"/mes/oqc/rules": { name: "OQC 规则", description: "页面：OQC 规则" },
	"/mes/integration/status": { name: "集成状态监控", description: "页面：集成状态监控" },
	"/mes/integration/device-data": { name: "设备数采", description: "页面：设备数采" },
	"/mes/integration/manual-entry": { name: "耗材状态录入", description: "页面：耗材状态录入" },
	"/mes/work-orders": {
		name: "工单管理",
		description: "管理生产工单，包括创建、查看、编辑工单信息",
	},
	"/mes/runs": { name: "批次管理", description: "页面：批次管理" },
	"/mes/bake-records": { name: "烘烤记录", description: "页面：烘烤记录" },
	"/mes/solder-paste-usage": { name: "锡膏使用记录", description: "页面：锡膏使用记录" },
	"/mes/cold-storage-temperatures": { name: "冷藏温度记录", description: "页面：冷藏温度记录" },
	"/mes/stencil-usage": { name: "钢网使用记录", description: "页面：钢网使用记录" },
	"/mes/stencil-cleaning": { name: "钢网清洗记录", description: "页面：钢网清洗记录" },
	"/mes/squeegee-usage": { name: "刮刀使用记录", description: "页面：刮刀使用记录" },
	"/mes/equipment-inspections": { name: "设备点检记录", description: "页面：设备点检记录" },
	"/mes/oven-program-records": { name: "炉温程式记录", description: "页面：炉温程式记录" },
	"/mes/maintenance-records": { name: "维修记录", description: "页面：维修记录" },
	"/mes/readiness-exceptions": { name: "准备异常", description: "页面：准备异常" },
	"/mes/readiness-config": { name: "准备检查配置", description: "页面：准备检查配置" },
	"/mes/time-rules": { name: "时间规则管理", description: "页面：时间规则管理" },
	"/mes/loading": {
		name: "上料防错",
		description: "页面：上料防错",
	},
	"/mes/fai": { name: "首件检验", description: "页面：首件检验" },
	"/mes/fqc": { name: "末件检验", description: "页面：末件检验" },
	"/mes/execution": {
		name: "工位执行",
		description: "工位级别的生产执行，包括扫描、数据采集、异常处理",
	},
	"/mes/routes": { name: "生产路由管理", description: "定义和管理产品的生产路由（工艺流程）" },
	"/mes/route-versions": { name: "路由版本", description: "页面：路由版本" },
	"/mes/lines": { name: "产线管理", description: "管理生产线配置，包括工位设置" },
	"/mes/data-collection-specs": { name: "采集项管理", description: "页面：采集项管理" },
	"/mes/materials": { name: "物料主数据", description: "页面：物料主数据" },
	"/mes/material-lots": { name: "物料批次", description: "页面：物料批次" },
	"/mes/boms": { name: "BOM", description: "页面：BOM" },
	"/mes/work-centers": { name: "工作中心", description: "页面：工作中心" },
	"/mes/products": { name: "产品管理", description: "管理产品主数据和 BOM 信息" },
	"/mes/oqc": { name: "OQC 出货检验", description: "出货质量检验，抽检并判定批次是否放行" },
	"/mes/daily-qc-records": { name: "日常QC记录", description: "页面：日常QC记录" },
	"/mes/production-exception-records": { name: "生产异常记录", description: "页面：生产异常记录" },
	"/mes/defects": { name: "缺陷管理", description: "处理生产过程中的缺陷和不良品" },
	"/mes/rework-tasks": { name: "返工任务", description: "页面：返工任务" },
	"/mes/trace": { name: "追溯查询", description: "查询产品的完整生产追溯信息" },
	// System module
	"/system/user-management": { name: "用户管理", description: "页面：用户管理" },
	"/system/role-management": { name: "角色管理", description: "页面：角色管理" },
	"/system/audit-logs": { name: "审计日志", description: "查看系统操作日志，追踪用户操作" },
	"/system/settings": { name: "系统设置", description: "页面：系统设置" },
	"/system/integrations": { name: "集成管理", description: "页面：集成管理" },
	"/system/test-upload": { name: "测试上传", description: "页面：测试上传" },
	// Top-level pages (less specific, matched last)
	"/notifications": { name: "通知中心", description: "页面：通知中心" },
	"/login": { name: "登录", description: "页面：登录" },
	"/profile": { name: "个人资料", description: "查看和编辑个人账户信息" },
	"/mes": { name: "MES 模块", description: "制造执行系统" },
	"/system": { name: "系统管理", description: "系统配置" },
	"/": { name: "仪表盘", description: "系统首页" },
};

const moduleRoots = new Set(["/mes", "/system"]);

function isModuleRoot(route: string): boolean {
	return moduleRoots.has(route);
}

/**
 * Get context for the current route
 * Uses longest prefix matching for best accuracy
 */
export function getRouteDisplayName(pathname: string): string {
	return getRouteContext(pathname).name;
}

export function getRouteCacheKey(pathname: string): string {
	if (knownRoutes[pathname]) {
		return pathname;
	}

	let bestMatch = "";
	let bestMatchLength = 0;

	for (const route of Object.keys(knownRoutes)) {
		if (route !== "/" && pathname.startsWith(route)) {
			if (route.length > bestMatchLength) {
				bestMatch = route;
				bestMatchLength = route.length;
			}
		}
	}

	if (bestMatch) {
		if (isModuleRoot(bestMatch) && pathname !== bestMatch) {
			return pathname;
		}
		return bestMatch;
	}

	if (pathname === "/") {
		return "/";
	}

	return pathname;
}

export function getRouteContext(pathname: string): RouteContext {
	// 1. Exact match first
	if (knownRoutes[pathname]) {
		return knownRoutes[pathname];
	}

	// 2. Find the longest matching prefix (most specific route wins)
	let bestMatch: RouteContext | null = null;
	let bestMatchLength = 0;
	let bestMatchRoute = "";

	for (const [route, context] of Object.entries(knownRoutes)) {
		if (route !== "/" && pathname.startsWith(route)) {
			// Check if this is a longer (more specific) match
			if (route.length > bestMatchLength) {
				bestMatch = context;
				bestMatchLength = route.length;
				bestMatchRoute = route;
			}
		}
	}

	if (bestMatch) {
		if (isModuleRoot(bestMatchRoute) && pathname !== bestMatchRoute) {
			bestMatch = null;
		} else {
			return bestMatch;
		}
	}

	// 3. Auto-detect from document title (removes app name suffix if present)
	if (typeof document !== "undefined" && document.title) {
		const title = document.title;
		// Remove common suffixes like " - AppName" or " | AppName"
		const cleanTitle = title.split(/\s*[-|]\s*/)[0]?.trim();
		if (cleanTitle && cleanTitle.length > 0 && cleanTitle.length < 30) {
			return { name: cleanTitle, description: "" };
		}
	}

	// 4. Generate from path segments
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length > 0) {
		const lastSegment = segments[segments.length - 1];
		if (lastSegment) {
			// Convert kebab-case to readable name
			const name = lastSegment
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");
			return { name, description: pathname };
		}
	}

	return { name: "当前页面", description: pathname };
}
