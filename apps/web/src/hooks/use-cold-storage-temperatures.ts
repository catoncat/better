import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type ColdStorageTemperatureRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["cold-storage-temperature-records"]["get"]>
>["data"];
export type ColdStorageTemperatureRecordListData =
	NonNullable<ColdStorageTemperatureRecordListResponse>["data"];
export type ColdStorageTemperatureRecord = ColdStorageTemperatureRecordListData["items"][number];

export type ColdStorageTemperatureRecordQuery = {
	measuredFrom?: string;
	measuredTo?: string;
	page?: number;
	pageSize?: number;
};

type ColdStorageTemperatureRecordCreateInput =
	Parameters<(typeof client.api)["cold-storage-temperature-records"]["post"]>[0];

export function useColdStorageTemperatureRecordList(query: ColdStorageTemperatureRecordQuery) {
	return useQuery<ColdStorageTemperatureRecordListData>({
		queryKey: ["mes", "cold-storage-temperature-records", query],
		queryFn: async () => {
			const response = await client.api["cold-storage-temperature-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: ColdStorageTemperatureRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateColdStorageTemperatureRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: ColdStorageTemperatureRecordCreateInput) => {
			const response = await client.api["cold-storage-temperature-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("冷藏温度记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "cold-storage-temperature-records"] });
		},
		onError: (error: unknown) => showError("创建冷藏温度记录失败", error),
	});
}
