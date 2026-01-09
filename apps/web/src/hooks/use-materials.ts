import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const materialsApi = client.api.materials;
type MaterialListResponse = Awaited<ReturnType<typeof materialsApi.get>>["data"];
export type MaterialList = NonNullable<MaterialListResponse>;
export type MaterialListItem = MaterialList["items"][number];

export interface UseMaterialListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	category?: string;
	unit?: string;
	model?: string;
	synced?: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
}

export function useMaterialList(params: UseMaterialListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const category = params.category ?? "";
	const unit = params.unit ?? "";
	const model = params.model ?? "";
	const synced = params.synced ?? "all";
	const updatedFrom = params.updatedFrom ?? "";
	const updatedTo = params.updatedTo ?? "";
	const sort = params.sort ?? "";

	return useQuery<MaterialList>({
		queryKey: [
			"mes",
			"materials",
			page,
			pageSize,
			search,
			category,
			unit,
			model,
			synced,
			updatedFrom,
			updatedTo,
			sort,
		],
		queryFn: async () => {
			const response = await materialsApi.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					category: category || undefined,
					unit: unit || undefined,
					model: model || undefined,
					synced: synced !== "all" ? synced : undefined,
					updatedFrom: updatedFrom || undefined,
					updatedTo: updatedTo || undefined,
					sort: sort || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: MaterialList | undefined) => previousData,
		staleTime: 15_000,
	});
}
