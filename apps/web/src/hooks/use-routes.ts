import { useQuery } from "@tanstack/react-query";
import { fetchClient } from "@/lib/api-client";

export type RouteSummary = {
	code: string;
	name: string;
	sourceSystem: string;
	productCode: string | null;
	version: string | null;
	isActive: boolean;
	effectiveFrom: string | null;
	effectiveTo: string | null;
	updatedAt: string;
	stepCount: number;
};

export type RouteDetail = {
	route: {
		id: string;
		code: string;
		name: string;
		sourceSystem: string;
		sourceKey: string | null;
		productCode: string | null;
		version: string | null;
		isActive: boolean;
		effectiveFrom: string | null;
		effectiveTo: string | null;
		createdAt: string;
		updatedAt: string;
	};
	steps: Array<{
		stepNo: number;
		sourceStepKey: string | null;
		operationCode: string;
		operationName: string;
		stationGroupCode: string | null;
		stationGroupName: string | null;
		stationType: string;
		requiresFAI: boolean;
		isLast: boolean;
	}>;
};

export type RouteListResponse = {
	items: RouteSummary[];
	total: number;
	page: number;
	pageSize: number;
};

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

	return useQuery({
		queryKey: ["mes", "routes", page, pageSize, search, sourceSystem],
		queryFn: async () => {
			const query = new URLSearchParams();
			query.set("page", String(page));
			query.set("pageSize", String(pageSize));
			if (search) query.set("search", search);
			if (sourceSystem) query.set("sourceSystem", sourceSystem);
			return fetchClient<RouteListResponse>(`/routes?${query.toString()}`);
		},
		placeholderData: (previousData: RouteListResponse | undefined) => previousData,
		staleTime: 15_000,
	});
}

export function useRouteSearch(search: string) {
	return useQuery({
		queryKey: ["mes", "routes-search", search],
		queryFn: async () => {
			const query = new URLSearchParams();
			query.set("page", "1");
			query.set("pageSize", "50");
			if (search) query.set("search", search);
			return fetchClient<RouteListResponse>(`/routes?${query.toString()}`);
		},
		staleTime: 15_000,
	});
}

export function useRouteDetail(routingCode: string) {
	return useQuery({
		queryKey: ["mes", "route-detail", routingCode],
		enabled: Boolean(routingCode),
		queryFn: async () =>
			fetchClient<RouteDetail>(`/routes/${encodeURIComponent(routingCode)}`),
		staleTime: 15_000,
	});
}
