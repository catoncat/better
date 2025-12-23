import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

// Infer types from the API using Eden Treaty
type ApiWorkOrderResponse = Awaited<ReturnType<typeof client.api.work.orders.get>>["data"];
export type WorkOrder = NonNullable<ApiWorkOrderResponse>["items"][number];
export type WorkOrderList = Exclude<
	ApiWorkOrderResponse,
	{ code: string; message: string } | null | undefined
>;

type WorkOrderReceiveInput = Parameters<(typeof client.api.integration)["work-orders"]["post"]>[0];
type WorkOrderReleaseInput = Parameters<
	ReturnType<typeof client.api.work.orders>["release"]["post"]
>[0];

interface UseWorkOrderListParams {
	page?: number;
	pageSize?: number;
	status?: string | string[];
	search?: string;
	sort?: string;
}

export function useWorkOrderList(params: UseWorkOrderListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const status = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "");
	const search = params.search ?? "";
	const sort = params.sort ?? "";

	return useQuery<WorkOrderList>({
		queryKey: ["mes", "work-orders", page, pageSize, search, status, sort],
		queryFn: async () => {
			const { data, error } = await client.api.work.orders.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					status: status || undefined,
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

	return useMutation({
		mutationFn: async (body: WorkOrderReceiveInput) => {
			const { data, error } = await client.api.integration["work-orders"].post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "接收工单失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("工单已接收");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
	});
}

export function useReleaseWorkOrder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ woNo, ...body }: WorkOrderReleaseInput & { woNo: string }) => {
			const { data, error } = await client.api.work.orders({ woNo }).release.post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "发布工单失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("工单已发布");
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
	});
}
