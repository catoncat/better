import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const routesApi = client.api.routes;
type RouteListResponse = Awaited<ReturnType<typeof routesApi.get>>["data"];
type RouteListData = NonNullable<RouteListResponse>;
export type RouteSummary = RouteListData["items"][number];
export type RouteList = RouteListData;

const routeDetailApi = (code: string) => client.api.routes({ routingCode: code });
type RouteDetailResponse = Awaited<ReturnType<ReturnType<typeof routeDetailApi>["get"]>>["data"];
export type RouteDetail = NonNullable<RouteDetailResponse>;

interface UseRouteListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	sourceSystem?: string;
}

export function useRouteList(params: UseRouteListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const sourceSystem = params.sourceSystem ?? "";

	return useQuery<RouteList>({
		queryKey: ["mes", "routes", page, pageSize, search, sourceSystem],
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

export function useRouteSearch(search: string) {
	return useQuery<RouteList>({
		queryKey: ["mes", "routes-search", search],
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

export function useRouteDetail(routingCode: string) {
	return useQuery<RouteDetail>({
		queryKey: ["mes", "route-detail", routingCode],
		enabled: Boolean(routingCode),
		queryFn: async () => {
			const response = await client.api.routes({ routingCode }).get();
			return unwrap(response);
		},
		staleTime: 15_000,
	});
}
