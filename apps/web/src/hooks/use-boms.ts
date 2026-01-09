import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const bomsApi = client.api.boms;
type BomParentListResponse = Awaited<ReturnType<typeof bomsApi.get>>["data"];
export type BomParentList = NonNullable<BomParentListResponse>;
export type BomParentListItem = BomParentList["items"][number];

export interface UseBomParentListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	parentCode?: string;
	synced?: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
}

export function useBomParentList(params: UseBomParentListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 20;
	const search = params.search ?? "";
	const parentCode = params.parentCode ?? "";
	const synced = params.synced ?? "all";
	const updatedFrom = params.updatedFrom ?? "";
	const updatedTo = params.updatedTo ?? "";
	const sort = params.sort ?? "";

	return useQuery<BomParentList>({
		queryKey: [
			"mes",
			"boms",
			page,
			pageSize,
			search,
			parentCode,
			synced,
			updatedFrom,
			updatedTo,
			sort,
		],
		queryFn: async () => {
			const response = await bomsApi.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					parentCode: parentCode || undefined,
					synced: synced !== "all" ? synced : undefined,
					updatedFrom: updatedFrom || undefined,
					updatedTo: updatedTo || undefined,
					sort: sort || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: BomParentList | undefined) => previousData,
		staleTime: 15_000,
	});
}
