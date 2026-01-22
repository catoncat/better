import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type DailyQcRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["daily-qc-records"]["get"]>
>["data"];
export type DailyQcRecordListData = NonNullable<DailyQcRecordListResponse>["data"];
export type DailyQcRecord = DailyQcRecordListData["items"][number];

export type DailyQcRecordQuery = {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	station?: string;
	shiftCode?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
};

type DailyQcCreateInput = Parameters<(typeof client.api)["daily-qc-records"]["post"]>[0];

export function useDailyQcRecordList(query: DailyQcRecordQuery) {
	return useQuery<DailyQcRecordListData>({
		queryKey: ["mes", "daily-qc-records", query],
		queryFn: async () => {
			const response = await client.api["daily-qc-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: DailyQcRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateDailyQcRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: DailyQcCreateInput) => {
			const response = await client.api["daily-qc-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("日常QC记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "daily-qc-records"] });
		},
		onError: (error: unknown) => showError("创建日常QC记录失败", error),
	});
}
