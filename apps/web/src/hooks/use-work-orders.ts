import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

// Infer types from the API using Eden Treaty
type ApiWorkOrderResponse = Awaited<ReturnType<(typeof client.api)["work-orders"]["get"]>>["data"];
export type WorkOrder = NonNullable<ApiWorkOrderResponse>["items"][number];
export type WorkOrderList = Exclude<
	ApiWorkOrderResponse,
	{ code: string; message: string } | null | undefined
>;

type WorkOrderReceiveInput = Parameters<(typeof client.api.integration)["work-orders"]["post"]>[0];
type WorkOrderReleaseInput = Parameters<
	ReturnType<(typeof client.api)["work-orders"]>["release"]["post"]
>[0];

interface UseWorkOrderListParams {
	page?: number;
	pageSize?: number;
	status?: string | string[];
	erpPickStatus?: string | string[];
	routingId?: string | string[];
	search?: string;
	sort?: string;
}

export function useWorkOrderList(params: UseWorkOrderListParams, options?: { enabled?: boolean }) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const status = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "");
	const erpPickStatus = Array.isArray(params.erpPickStatus)
		? params.erpPickStatus.join(",")
		: (params.erpPickStatus ?? "");
	const routingId = Array.isArray(params.routingId)
		? params.routingId.join(",")
		: (params.routingId ?? "");
	const search = params.search ?? "";
	const sort = params.sort ?? "";

	return useQuery<WorkOrderList>({
		queryKey: [
			"mes",
			"work-orders",
			page,
			pageSize,
			search,
			status,
			erpPickStatus,
			routingId,
			sort,
		],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await client.api["work-orders"].get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					status: status || undefined,
					erpPickStatus: erpPickStatus || undefined,
					routingId: routingId || undefined,
					sort: sort || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			if (!data) {
				throw new Error("No data received");
			}

			return data;
		},
		placeholderData: (previousData: WorkOrderList | undefined) => previousData,
		staleTime: 30_000,
	});
}

export function useReceiveWorkOrder() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (body: WorkOrderReceiveInput) => {
			const response = await client.api.integration["work-orders"].post(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("工单已接收");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("接收工单失败", error),
	});
}

export function useReleaseWorkOrder() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ woNo, ...body }: WorkOrderReleaseInput & { woNo: string }) => {
			const response = await client.api["work-orders"]({ woNo }).release.post(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("工单已发布");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("发布工单失败", error),
	});
}

export function useUpdatePickStatus() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ woNo, pickStatus }: { woNo: string; pickStatus: string }) => {
			const response = await client.api["work-orders"]({ woNo })["pick-status"].patch({
				pickStatus,
			});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("领料状态已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("更新领料状态失败", error),
	});
}

export function useUpdateWorkOrderRouting() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ woNo, routingCode }: { woNo: string; routingCode: string }) => {
			const response = await client.api["work-orders"]({ woNo }).routing.patch({
				routingCode,
			});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("路由已关联");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("关联路由失败", error),
	});
}

export function useCloseWorkOrder() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ woNo }: { woNo: string }) => {
			const response = await client.api["work-orders"]({ woNo }).close.post();
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("工单已收尾");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("工单收尾失败", error),
	});
}
