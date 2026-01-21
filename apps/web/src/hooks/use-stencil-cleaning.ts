import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type StencilCleaningRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["stencil-cleaning-records"]["get"]>
>["data"];
export type StencilCleaningRecordListData = NonNullable<StencilCleaningRecordListResponse>["data"];
export type StencilCleaningRecord = StencilCleaningRecordListData["items"][number];

export type StencilCleaningRecordQuery = {
	stencilId?: string;
	lineCode?: string;
	cleanedBy?: string;
	cleanedFrom?: string;
	cleanedTo?: string;
	page?: number;
	pageSize?: number;
};

type StencilCleaningCreateInput = Parameters<
	(typeof client.api)["stencil-cleaning-records"]["post"]
>[0];

export function useStencilCleaningRecordList(query: StencilCleaningRecordQuery) {
	return useQuery<StencilCleaningRecordListData>({
		queryKey: ["mes", "stencil-cleaning-records", query],
		queryFn: async () => {
			const response = await client.api["stencil-cleaning-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: StencilCleaningRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateStencilCleaningRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: StencilCleaningCreateInput) => {
			const response = await client.api["stencil-cleaning-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("钢网清洗记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "stencil-cleaning-records"] });
		},
		onError: (error: unknown) => showError("创建钢网清洗记录失败", error),
	});
}
