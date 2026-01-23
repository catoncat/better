import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type StencilUsageRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["stencil-usage-records"]["get"]>
>["data"];
export type StencilUsageRecordListData = NonNullable<StencilUsageRecordListResponse>["data"];
export type StencilUsageRecord = StencilUsageRecordListData["items"][number];

export type StencilUsageRecordQuery = {
	stencilId?: string;
	runNo?: string;
	lineCode?: string;
	productModel?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type StencilUsageCreateInput = Parameters<(typeof client.api)["stencil-usage-records"]["post"]>[0];

export function useStencilUsageRecordList(query: StencilUsageRecordQuery) {
	return useQuery<StencilUsageRecordListData>({
		queryKey: ["mes", "stencil-usage-records", query],
		queryFn: async () => {
			const response = await client.api["stencil-usage-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: StencilUsageRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateStencilUsageRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: StencilUsageCreateInput) => {
			const response = await client.api["stencil-usage-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("钢网使用记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "stencil-usage-records"] });
		},
		onError: (error: unknown) => showError("创建钢网使用记录失败", error),
	});
}
