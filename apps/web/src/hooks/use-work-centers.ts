import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const workCentersApi = client.api["work-centers"];
type WorkCenterListResponse = Awaited<ReturnType<typeof workCentersApi.get>>["data"];
export type WorkCenterList = NonNullable<WorkCenterListResponse>;
export type WorkCenterListItem = WorkCenterList["items"][number];

export interface UseWorkCenterListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	departmentCode?: string;
	stationGroupCode?: string;
	synced?: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
}

export function useWorkCenterList(
	params: UseWorkCenterListParams,
	options?: { enabled?: boolean },
) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const departmentCode = params.departmentCode ?? "";
	const stationGroupCode = params.stationGroupCode ?? "";
	const synced = params.synced ?? "all";
	const updatedFrom = params.updatedFrom ?? "";
	const updatedTo = params.updatedTo ?? "";
	const sort = params.sort ?? "";

	return useQuery<WorkCenterList>({
		queryKey: [
			"mes",
			"work-centers",
			page,
			pageSize,
			search,
			departmentCode,
			stationGroupCode,
			synced,
			updatedFrom,
			updatedTo,
			sort,
		],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await workCentersApi.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					departmentCode: departmentCode || undefined,
					stationGroupCode: stationGroupCode || undefined,
					synced: synced !== "all" ? synced : undefined,
					updatedFrom: updatedFrom || undefined,
					updatedTo: updatedTo || undefined,
					sort: sort || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: WorkCenterList | undefined) => previousData,
		staleTime: 15_000,
	});
}
