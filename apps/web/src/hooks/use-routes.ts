import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

const routesApi = client.api.routes;
type RouteListResponse = Awaited<ReturnType<typeof routesApi.get>>["data"];
type RouteListData = NonNullable<RouteListResponse>;
export type RouteSummary = RouteListData["items"][number];
export type RouteList = RouteListData;

const routeDetailApi = (code: string) => client.api.routes({ routingCode: code });
type RouteDetailResponse = Awaited<ReturnType<ReturnType<typeof routeDetailApi>["get"]>>["data"];
export type RouteDetail = NonNullable<RouteDetailResponse>;
type RouteUpdateInput = Parameters<ReturnType<typeof routeDetailApi>["patch"]>[0];

interface UseRouteListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	sourceSystem?: string;
}

export function useRouteList(params: UseRouteListParams, options?: { enabled?: boolean }) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const sourceSystem = params.sourceSystem ?? "";

	return useQuery<RouteList>({
		queryKey: ["mes", "routes", page, pageSize, search, sourceSystem],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await routesApi.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					sourceSystem: sourceSystem && sourceSystem !== "all" ? sourceSystem : undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: RouteList | undefined) => previousData,
		staleTime: 15_000,
	});
}

export function useRouteSearch(search: string, options?: { enabled?: boolean }) {
	return useQuery<RouteList>({
		queryKey: ["mes", "routes-search", search],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await routesApi.get({
				query: {
					page: 1,
					pageSize: 50,
					search: search || undefined,
				},
			});
			return unwrap(response);
		},
		staleTime: 15_000,
	});
}

export function useRouteDetail(routingCode: string, options?: { enabled?: boolean }) {
	return useQuery<RouteDetail>({
		queryKey: ["mes", "route-detail", routingCode],
		enabled: Boolean(routingCode) && (options?.enabled ?? true),
		queryFn: async () => {
			const response = await client.api.routes({ routingCode }).get();
			return unwrap(response);
		},
		staleTime: 15_000,
	});
}

export function useUpdateRouteProcessType(routingCode: string) {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ processType }: { processType: RouteUpdateInput["processType"] }) => {
			const response = await client.api.routes({ routingCode }).patch({ processType });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("路由工艺已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "route-detail", routingCode] });
			queryClient.invalidateQueries({ queryKey: ["mes", "routes"] });
		},
		onError: (error: unknown) => showError("更新路由工艺失败", error),
	});
}
