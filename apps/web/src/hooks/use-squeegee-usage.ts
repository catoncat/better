import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type SqueegeeUsageRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["squeegee-usage-records"]["get"]>
>["data"];
export type SqueegeeUsageRecordListData = NonNullable<SqueegeeUsageRecordListResponse>["data"];
export type SqueegeeUsageRecord = SqueegeeUsageRecordListData["items"][number];

export type SqueegeeUsageRecordQuery = {
	squeegeeId?: string;
	runNo?: string;
	lineCode?: string;
	productModel?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type SqueegeeUsageCreateInput = Parameters<
	(typeof client.api)["squeegee-usage-records"]["post"]
>[0];

export function useSqueegeeUsageRecordList(query: SqueegeeUsageRecordQuery) {
	return useQuery<SqueegeeUsageRecordListData>({
		queryKey: ["mes", "squeegee-usage-records", query],
		queryFn: async () => {
			const response = await client.api["squeegee-usage-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: SqueegeeUsageRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateSqueegeeUsageRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: SqueegeeUsageCreateInput) => {
			const response = await client.api["squeegee-usage-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("刮刀使用记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "squeegee-usage-records"] });
		},
		onError: (error: unknown) => showError("创建刮刀使用记录失败", error),
	});
}
