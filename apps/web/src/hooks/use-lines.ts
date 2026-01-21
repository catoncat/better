import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type LineListResponse = Awaited<ReturnType<typeof client.api.lines.get>>["data"];
type LineListData = UnwrapEnvelope<NonNullable<LineListResponse>>;
type LineUpdateInput = Parameters<ReturnType<typeof client.api.lines>["patch"]>[0];
type LineCreateInput = Parameters<typeof client.api.lines.post>[0];
type LineDetailResponse = Awaited<ReturnType<ReturnType<typeof client.api.lines>["get"]>>["data"];
export type LineDetail = UnwrapEnvelope<NonNullable<LineDetailResponse>>;
export type LineSummary = LineListData["items"][number];
const lineProcessTypeApi = (lineId: string) => client.api.lines({ lineId })["process-type"];
type LineProcessTypeUpdateInput = Parameters<ReturnType<typeof lineProcessTypeApi>["patch"]>[0];

export interface UseLineListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	processType?: LineSummary["processType"] | "all";
	sort?: string;
}

export function useLines(options?: { enabled?: boolean }) {
	return useQuery<LineListData>({
		queryKey: ["mes", "lines"],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api.lines.get({
				query: {
					page: 1,
					pageSize: 100,
				},
			});
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function useLineList(params: UseLineListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const processType = params.processType ?? "all";
	const sort = params.sort ?? "";

	return useQuery<LineListData>({
		queryKey: ["mes", "lines", page, pageSize, search, processType, sort],
		queryFn: async () => {
			const response = await client.api.lines.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					processType: processType === "all" ? undefined : processType,
					sort: sort || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: LineListData | undefined) => previousData,
		staleTime: 15_000,
	});
}

export function useLineDetail(lineId: string) {
	return useQuery<LineDetail>({
		queryKey: ["mes", "lines", lineId],
		enabled: Boolean(lineId),
		queryFn: async () => {
			const response = await client.api.lines({ lineId }).get();
			return unwrap(response);
		},
		staleTime: 15_000,
	});
}

export function useCreateLine() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (payload: LineCreateInput) => {
			const response = await client.api.lines.post(payload);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("产线已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines"] });
		},
		onError: (error: unknown) => showError("创建产线失败", error),
	});
}

export function useUpdateLine(lineId: string) {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (payload: LineUpdateInput) => {
			const response = await client.api.lines({ lineId }).patch(payload);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("产线已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "lines", lineId] });
		},
		onError: (error: unknown) => showError("更新产线失败", error),
	});
}

export function useDeleteLine() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (lineId: string) => {
			const response = await client.api.lines({ lineId }).delete();
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("产线已删除");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines"] });
		},
		onError: (error: unknown) => showError("删除产线失败", error),
	});
}

export function useUpdateLineProcessType() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			lineId,
			processType,
		}: {
			lineId: string;
			processType: LineProcessTypeUpdateInput["processType"];
		}) => {
			const response = await lineProcessTypeApi(lineId).patch({ processType });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("产线工艺已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines"] });
			queryClient.invalidateQueries({
				queryKey: ["mes", "lines", variables.lineId, "readiness-config"],
			});
		},
		onError: (error: unknown) => showError("更新产线工艺失败", error),
	});
}
