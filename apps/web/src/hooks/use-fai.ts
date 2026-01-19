import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
type FaiListResponse = Awaited<ReturnType<typeof client.api.fai.get>>["data"];
export type FaiListData = NonNullable<FaiListResponse>["data"];
export type FaiInspection = FaiListData["items"][number];

type FaiDetailResponse = Awaited<ReturnType<ReturnType<typeof client.api.fai>["get"]>>["data"];
export type FaiDetail = NonNullable<FaiDetailResponse>["data"];

export type FaiQuery = {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
};

/**
 * List FAI inspections with filters
 */
export function useFaiList(query: FaiQuery) {
	return useQuery<FaiListData | null>({
		queryKey: ["mes", "fai", "list", query],
		queryFn: async () => {
			const response = await client.api.fai.get({ query });

			if (response.error) {
				throw new Error("Failed to fetch FAI list");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: FaiListData };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Get FAI by ID
 */
export function useFaiDetail(faiId: string | undefined) {
	return useQuery<FaiDetail | null>({
		queryKey: ["mes", "fai", "detail", faiId],
		enabled: Boolean(faiId),
		queryFn: async () => {
			if (!faiId) throw new Error("No FAI ID");
			const response = await client.api.fai({ faiId }).get();

			if (response.error) {
				throw new Error("Failed to fetch FAI");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: FaiDetail };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Get FAI by run number
 */
export function useFaiByRun(runNo: string | undefined) {
	return useQuery({
		queryKey: ["mes", "fai", "run", runNo],
		enabled: Boolean(runNo),
		queryFn: async () => {
			if (!runNo) return null;
			const response = await client.api.fai.run({ runNo }).get();
			if (response.error) {
				const errorVal = response.error.value as { error?: { code?: string } } | undefined;
				if (errorVal?.error?.code === "FAI_NOT_FOUND") {
					return null;
				}
				throw new Error("Failed to fetch FAI");
			}
			const data = response.data as { ok: boolean; data?: FaiDetail } | null;
			return data?.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Check FAI gate for run authorization
 */
export function useFaiGate(runNo: string | undefined) {
	return useQuery<{ requiresFai: boolean; faiPassed: boolean; faiId?: string } | null>({
		queryKey: ["mes", "fai", "gate", runNo],
		enabled: Boolean(runNo),
		queryFn: async () => {
			if (!runNo) return null;
			const response = await client.api.fai.run({ runNo }).gate.get();

			if (response.error) {
				throw new Error("Failed to fetch FAI gate");
			}

			if (!response.data) return null;

			type FaiGateResult = { requiresFai: boolean; faiPassed: boolean; faiId?: string };
			const data = response.data as { ok: boolean; data?: FaiGateResult };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Create FAI for run
 */
export function useCreateFai() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ runNo, sampleQty }: { runNo: string; sampleQty: number }) => {
			const response = await client.api.fai.run({ runNo }).post({ sampleQty });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("FAI 任务已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", variables.runNo] });
		},
		onError: (error: unknown) => showError("创建 FAI 任务失败", error),
	});
}

/**
 * Start FAI inspection
 */
export function useStartFai() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (faiId: string) => {
			const response = await client.api.fai({ faiId }).start.post({});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("FAI 检验已开始");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai"] });
		},
		onError: (error: unknown) => showError("开始 FAI 失败", error),
	});
}

/**
 * Record FAI item
 */
export function useRecordFaiItem() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			faiId,
			data,
		}: {
			faiId: string;
			data: {
				unitSn?: string;
				itemName: string;
				itemSpec?: string;
				actualValue?: string;
				result: "PASS" | "FAIL" | "NA";
				defectCode?: string;
				remark?: string;
			};
		}) => {
			const response = await client.api.fai({ faiId }).items.post(data);
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("检验项已记录");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai", "detail", variables.faiId] });
			queryClient.invalidateQueries({ queryKey: ["mes", "fai", "list"] });
		},
		onError: (error: unknown) => showError("记录检验项失败", error),
	});
}

/**
 * Complete FAI
 */
export function useCompleteFai() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			faiId,
			decision,
			failedQty,
			passedQty,
			remark,
		}: {
			faiId: string;
			decision: "PASS" | "FAIL";
			failedQty?: number;
			passedQty?: number;
			remark?: string;
		}) => {
			const response = await client.api.fai({ faiId }).complete.post({
				decision,
				failedQty,
				passedQty,
				remark,
			});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("FAI 已完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
		},
		onError: (error: unknown) => showError("完成 FAI 失败", error),
	});
}
