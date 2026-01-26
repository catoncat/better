import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type FqcListResponse = Awaited<ReturnType<typeof client.api.fqc.get>>["data"];
export type FqcListData = NonNullable<FqcListResponse>["data"];
export type FqcInspection = FqcListData["items"][number];

export type FqcDetailResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.fqc>["get"]>
>["data"];
export type FqcDetail = NonNullable<FqcDetailResponse>["data"];

export type FqcQuery = {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
};

type FqcRecordInput = Parameters<ReturnType<typeof client.api.fqc>["items"]["post"]>[0];
type FqcCompleteInput = Parameters<ReturnType<typeof client.api.fqc>["complete"]["post"]>[0];
type FqcSignInput = Parameters<ReturnType<typeof client.api.fqc>["sign"]["post"]>[0];

export function useFqcList(query: FqcQuery, options?: { enabled?: boolean }) {
	return useQuery<FqcListData>({
		queryKey: ["mes", "fqc", "list", query],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api.fqc.get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: FqcListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useFqcDetail(fqcId: string | undefined, options?: { enabled?: boolean }) {
	return useQuery<FqcDetail | null>({
		queryKey: ["mes", "fqc", "detail", fqcId],
		enabled: Boolean(fqcId) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!fqcId) return null;
			const response = await client.api.fqc({ fqcId }).get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function useFqcByRun(runNo: string | undefined, options?: { enabled?: boolean }) {
	return useQuery<FqcDetail | null>({
		queryKey: ["mes", "fqc", "run", runNo],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!runNo) return null;
			const response = await client.api.fqc.run({ runNo }).get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function useCreateFqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			runNo,
			sampleQty,
			remark,
		}: {
			runNo: string;
			sampleQty?: number;
			remark?: string;
		}) => {
			const response = await client.api.fqc.run({ runNo }).post({ sampleQty, remark });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("末件检验任务已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", variables.runNo] });
		},
		onError: (error: unknown) => showError("创建末件检验失败", error),
	});
}

export function useStartFqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (fqcId: string) => {
			const response = await client.api.fqc({ fqcId }).start.post({});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("末件检验已开始");
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc"] });
		},
		onError: (error: unknown) => showError("开始末件检验失败", error),
	});
}

export function useRecordFqcItem() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ fqcId, data }: { fqcId: string; data: FqcRecordInput }) => {
			const response = await client.api.fqc({ fqcId }).items.post(data);
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("检验项已记录");
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc", "detail", variables.fqcId] });
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc", "list"] });
		},
		onError: (error: unknown) => showError("记录检验项失败", error),
	});
}

export function useCompleteFqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ fqcId, data }: { fqcId: string; data: FqcCompleteInput }) => {
			const response = await client.api.fqc({ fqcId }).complete.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("末件检验已完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail"] });
		},
		onError: (error: unknown) => showError("完成末件检验失败", error),
	});
}

export function useSignFqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ fqcId, data }: { fqcId: string; data: FqcSignInput }) => {
			const response = await client.api.fqc({ fqcId }).sign.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("末件检验已签字确认");
			queryClient.invalidateQueries({ queryKey: ["mes", "fqc"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail"] });
		},
		onError: (error: unknown) => showError("末件检验签字失败", error),
	});
}
