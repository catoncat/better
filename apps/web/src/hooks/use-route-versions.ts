import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchClient } from "@/lib/api-client";

export type RouteVersion = {
	id: string;
	routingId: string;
	versionNo: number;
	status: string;
	snapshotJson: unknown;
	errorsJson: unknown | null;
	compiledAt: string;
	createdAt: string;
	updatedAt: string;
};

type RouteVersionListResponse = {
	ok: boolean;
	data: {
		items: RouteVersion[];
	};
	error?: { code?: string; message?: string };
};

type RouteVersionResponse = {
	ok: boolean;
	data: RouteVersion;
	error?: { code?: string; message?: string };
};

export function useRouteVersions(routingCode: string) {
	return useQuery({
		queryKey: ["mes", "route-versions", routingCode],
		enabled: Boolean(routingCode),
		queryFn: async () => {
			const response = await fetchClient<RouteVersionListResponse>(
				`/routes/${encodeURIComponent(routingCode)}/versions`,
			);
			if (!response.ok) {
				throw new Error(response.error?.message || "获取路由版本失败");
			}
			return response.data.items;
		},
		staleTime: 15_000,
	});
}

export function useCompileRouteVersion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (routingCode: string) => {
			const response = await fetchClient<RouteVersionResponse>(
				`/routes/${encodeURIComponent(routingCode)}/compile`,
				{ method: "POST" },
			);
			if (!response.ok) {
				throw new Error(response.error?.message || "编译路由失败");
			}
			return response.data;
		},
		onSuccess: (_data, routingCode) => {
			toast.success("路由版本已编译");
			queryClient.invalidateQueries({ queryKey: ["mes", "route-versions", routingCode] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
