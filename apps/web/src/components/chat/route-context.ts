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
	"/mes/work-orders": {
		name: "工单管理",
		description: "管理生产工单，包括创建、查看、编辑工单信息",
	},
	"/mes/runs": { name: "生产批次管理", description: "管理生产批次 (Run)，追踪生产进度" },
	"/mes/loading": {
		name: "上料验证",
		description: "SMT/DIP 产线上料验证，确保正确物料上到正确位置",
	},
	"/mes/fai": { name: "首件检验 (FAI)", description: "首件检验页面，对生产首件进行质量检验" },
	"/mes/execution": {
		name: "工位执行",
		description: "工位级别的生产执行，包括扫描、数据采集、异常处理",
	},
	"/mes/routes": { name: "生产路由管理", description: "定义和管理产品的生产路由（工艺流程）" },
	"/mes/lines": { name: "产线管理", description: "管理生产线配置，包括工位设置" },
	"/mes/materials": { name: "物料管理", description: "管理物料主数据和库存信息" },
	"/mes/products": { name: "产品管理", description: "管理产品主数据和 BOM 信息" },
	"/mes/oqc": { name: "OQC 出货检验", description: "出货质量检验，抽检并判定批次是否放行" },
	"/mes/defects": { name: "缺陷管理", description: "处理生产过程中的缺陷和不良品" },
	"/mes/trace": { name: "追溯查询", description: "查询产品的完整生产追溯信息" },
	// System module
	"/system/users": { name: "用户管理", description: "管理系统用户和权限" },
	"/system/audit-logs": { name: "审计日志", description: "查看系统操作日志，追踪用户操作" },
	"/system/config": { name: "系统配置", description: "配置系统参数和选项" },
	// Top-level pages (less specific, matched last)
	"/profile": { name: "个人资料", description: "查看和编辑个人账户信息" },
	"/mes": { name: "MES 模块", description: "制造执行系统" },
	"/system": { name: "系统管理", description: "系统配置" },
	"/": { name: "仪表盘", description: "系统首页" },
};

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

	for (const [route, context] of Object.entries(knownRoutes)) {
		if (route !== "/" && pathname.startsWith(route)) {
			// Check if this is a longer (more specific) match
			if (route.length > bestMatchLength) {
				bestMatch = context;
				bestMatchLength = route.length;
			}
		}
	}

	if (bestMatch) {
		return bestMatch;
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
