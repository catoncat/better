import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

// Infer types from the API using Eden Treaty
type ApiRunResponse = Awaited<ReturnType<typeof client.api.runs.get>>["data"];
export type Run = NonNullable<ApiRunResponse>["items"][number];
export type RunList = Exclude<ApiRunResponse, { code: string; message: string } | null | undefined>;

type RunCreateInput = Parameters<
	ReturnType<(typeof client.api)["work-orders"]>["runs"]["post"]
>[0];
type RunAuthorizeInput = Parameters<ReturnType<typeof client.api.runs>["authorize"]["post"]>[0];

interface UseRunListParams {
	page?: number;
	pageSize?: number;
	status?: string | string[];
	search?: string;
	sort?: string;
	woNo?: string;
}

export function useRunList(params: UseRunListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const status = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "");
	const search = params.search ?? "";
	const sort = params.sort ?? "";
	const woNo = params.woNo ?? "";

	return useQuery<RunList>({
		queryKey: ["mes", "runs", page, pageSize, search, status, sort, woNo],
		queryFn: async () => {
			const { data, error } = await client.api.runs.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					status: status || undefined,
					sort: sort || undefined,
					woNo: woNo || undefined,
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
		placeholderData: (previousData: RunList | undefined) => previousData,
		staleTime: 30_000,
	});
}

export function useCreateRun() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ woNo, ...body }: RunCreateInput & { woNo: string }) => {
			const { data, error } = await client.api["work-orders"]({ woNo }).runs.post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建批次失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("生产批次已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
	});
}

export function useAuthorizeRun() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ runNo, ...body }: RunAuthorizeInput & { runNo: string }) => {
			const { data, error } = await client.api.runs({ runNo }).authorize.post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "授权操作失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("授权状态已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
		},
	});
}
