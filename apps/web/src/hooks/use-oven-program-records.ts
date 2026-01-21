import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type OvenProgramRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["oven-program-records"]["get"]>
>["data"];
export type OvenProgramRecordListData = NonNullable<OvenProgramRecordListResponse>["data"];
export type OvenProgramRecord = OvenProgramRecordListData["items"][number];

export type OvenProgramRecordQuery = {
	lineCode?: string;
	equipmentId?: string;
	productName?: string;
	programName?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
};

type OvenProgramCreateInput = Parameters<(typeof client.api)["oven-program-records"]["post"]>[0];

export function useOvenProgramRecordList(query: OvenProgramRecordQuery) {
	return useQuery<OvenProgramRecordListData>({
		queryKey: ["mes", "oven-program-records", query],
		queryFn: async () => {
			const response = await client.api["oven-program-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: OvenProgramRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateOvenProgramRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: OvenProgramCreateInput) => {
			const response = await client.api["oven-program-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("炉温程式记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "oven-program-records"] });
		},
		onError: (error: unknown) => showError("创建炉温程式记录失败", error),
	});
}
