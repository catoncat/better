import { Permission } from "@better-app/db/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { client, unwrap } from "@/lib/eden";

/**
 * MES 入口智能重定向
 *
 * 根据用户权限选择最合适的默认页面，避免"入口即无权限"的阻断体验。
 * 优先级：WO(planner) > Execution(operator) > Loading(material) > Quality > Routes > Trace
 */
export const Route = createFileRoute("/_authenticated/mes/")({
	beforeLoad: async ({ context }) => {
		// 尝试从缓存获取权限，避免重复请求
		const cached = context.queryClient.getQueryData<{ roles: Array<{ permissions: string[] }> }>([
			"auth",
			"permissions",
		]);

		let permissions: Set<string>;

		if (cached) {
			permissions = new Set(cached.roles.flatMap((r) => r.permissions));
		} else {
			// 没有缓存时获取权限
			try {
				const response = await client.api.permissions.me.get();
				const data = unwrap(response);
				permissions = new Set(data.roles.flatMap((r) => r.permissions));
				// 写入缓存供后续使用
				context.queryClient.setQueryData(["auth", "permissions"], data);
			} catch {
				// 权限获取失败，fallback 到最通用的页面
				throw redirect({ to: "/mes/execution", replace: true });
			}
		}

		// 按权限优先级选择落点
		if (permissions.has(Permission.WO_READ)) {
			throw redirect({ to: "/mes/work-orders", replace: true });
		}
		if (permissions.has(Permission.EXEC_TRACK_IN) || permissions.has(Permission.EXEC_TRACK_OUT)) {
			throw redirect({ to: "/mes/execution", replace: true });
		}
		if (permissions.has(Permission.LOADING_VIEW) || permissions.has(Permission.LOADING_VERIFY)) {
			throw redirect({ to: "/mes/loading", replace: true });
		}
		if (permissions.has(Permission.QUALITY_FAI) || permissions.has(Permission.QUALITY_OQC)) {
			throw redirect({ to: "/mes/oqc", replace: true });
		}
		if (permissions.has(Permission.ROUTE_READ)) {
			throw redirect({ to: "/mes/routes", replace: true });
		}
		// trace 角色 fallback 到 execution（trace 页面需要 sn 参数，不适合做入口）

		// 默认 fallback：execution 是最通用的一线页面
		throw redirect({ to: "/mes/execution", replace: true });
	},
});
