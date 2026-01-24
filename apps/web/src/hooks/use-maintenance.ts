import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type MaintenanceRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["maintenance-records"]["get"]>
>["data"];
export type MaintenanceRecordListData = NonNullable<MaintenanceRecordListResponse>["data"];
export type MaintenanceRecord = MaintenanceRecordListData["items"][number];

// Get the API query type from the client
type ApiMaintenanceQuery = NonNullable<
	Parameters<(typeof client.api)["maintenance-records"]["get"]>[0]
>["query"];

export type MaintenanceRecordQuery = {
	lineId?: string;
	entityType?: string;
	status?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

type MaintenanceCreateInput = Parameters<(typeof client.api)["maintenance-records"]["post"]>[0];

type MaintenanceCompleteInput = {
	resolution: string;
	partsReplaced?: string;
	cost?: number;
	remark?: string;
};

type MaintenanceVerifyInput = {
	remark?: string;
};

export function useMaintenanceRecordList(query: MaintenanceRecordQuery) {
	return useQuery<MaintenanceRecordListData>({
		queryKey: ["mes", "maintenance-records", query],
		queryFn: async () => {
			// Cast to API query type - the API will validate
			const response = await client.api["maintenance-records"].get({
				query: query as ApiMaintenanceQuery,
			});
			return unwrap(response);
		},
		placeholderData: (previousData: MaintenanceRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useMaintenanceRecord(id: string) {
	return useQuery({
		queryKey: ["mes", "maintenance-records", id],
		queryFn: async () => {
			const response = await client.api["maintenance-records"]({ maintenanceId: id }).get();
			return unwrap(response);
		},
		enabled: Boolean(id),
	});
}

export function useCreateMaintenanceRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: MaintenanceCreateInput) => {
			const response = await client.api["maintenance-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("维修记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "maintenance-records"] });
		},
		onError: (error: unknown) => showError("创建维修记录失败", error),
	});
}

export function useUpdateMaintenanceRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
			const response = await client.api["maintenance-records"]({ maintenanceId: id }).patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("维修记录已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "maintenance-records"] });
		},
		onError: (error: unknown) => showError("更新维修记录失败", error),
	});
}

export function useCompleteMaintenanceRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: MaintenanceCompleteInput }) => {
			const response = await client.api["maintenance-records"]({ maintenanceId: id }).complete.post(
				data,
			);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("维修记录已完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "maintenance-records"] });
		},
		onError: (error: unknown) => showError("完成维修记录失败", error),
	});
}

export function useVerifyMaintenanceRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: MaintenanceVerifyInput }) => {
			const response = await client.api["maintenance-records"]({ maintenanceId: id }).verify.post(
				data,
			);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("维修记录已验证");
			queryClient.invalidateQueries({ queryKey: ["mes", "maintenance-records"] });
		},
		onError: (error: unknown) => showError("验证维修记录失败", error),
	});
}
