import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type SolderPasteUsageRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["solder-paste-usage-records"]["get"]>
>["data"];
export type SolderPasteUsageRecordListData =
	NonNullable<SolderPasteUsageRecordListResponse>["data"];
export type SolderPasteUsageRecord = SolderPasteUsageRecordListData["items"][number];

export type SolderPasteUsageRecordQuery = {
	lotId?: string;
	lineCode?: string;
	receivedFrom?: string;
	receivedTo?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
};

type SolderPasteUsageRecordCreateInput = Parameters<
	(typeof client.api)["solder-paste-usage-records"]["post"]
>[0];

export function useSolderPasteUsageRecordList(
	query: SolderPasteUsageRecordQuery,
	options?: { enabled?: boolean },
) {
	return useQuery<SolderPasteUsageRecordListData>({
		queryKey: ["mes", "solder-paste-usage-records", query],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api["solder-paste-usage-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: SolderPasteUsageRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateSolderPasteUsageRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: SolderPasteUsageRecordCreateInput) => {
			const response = await client.api["solder-paste-usage-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("锡膏使用记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "solder-paste-usage-records"] });
		},
		onError: (error: unknown) => showError("创建锡膏使用记录失败", error),
	});
}
