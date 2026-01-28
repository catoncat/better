/**
 * Route context for the chat assistant
 * Provides page name and description for current route
 */

export type RouteContext = {
	name: string;
	description: string;
};

/**
 * Known route contexts (for better descriptions)
 * This is optional - unknown routes will still work with auto-detection
 */
const knownRoutes: Record<string, RouteContext> = {
	"/": { name: "仪表盘", description: "系统首页" },
	"/mes": { name: "MES 模块", description: "制造执行系统" },
	"/system": { name: "系统管理", description: "系统配置" },
	"/profile": { name: "个人资料", description: "个人账户信息" },
};

/**
 * Get context for the current route
 * Dynamically detects page name from document title or route path
 */
export function getRouteContext(pathname: string): RouteContext {
	// 1. Check known routes first
	if (knownRoutes[pathname]) {
		return knownRoutes[pathname];
	}

	// 2. Try prefix matching for known routes
	for (const [route, context] of Object.entries(knownRoutes)) {
		if (pathname.startsWith(route) && route !== "/") {
			return context;
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
