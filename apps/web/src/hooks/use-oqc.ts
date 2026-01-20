import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
export type OqcListResponse = Awaited<ReturnType<typeof client.api.oqc.get>>["data"];
export type OqcListData = NonNullable<OqcListResponse>["data"];
export type OqcInspection = OqcListData["items"][number];

export type OqcDetailResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.oqc>["get"]>
>["data"];
export type OqcDetail = NonNullable<OqcDetailResponse>["data"];

export type OqcQuery = {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
};

type OqcRecordInput = Parameters<ReturnType<typeof client.api.oqc>["items"]["post"]>[0];
type OqcCompleteInput = Parameters<ReturnType<typeof client.api.oqc>["complete"]["post"]>[0];
type MrbDecisionInput = Parameters<ReturnType<typeof client.api.runs>["mrb-decision"]["post"]>[0];

/**
 * List OQC inspections with filters
 */
export function useOqcList(query: OqcQuery) {
	return useQuery<OqcListData>({
		queryKey: ["mes", "oqc", "list", query],
		queryFn: async () => {
			const response = await client.api.oqc.get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: OqcListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

/**
 * Get OQC by ID
 */
export function useOqcDetail(oqcId: string | undefined) {
	return useQuery<OqcDetail | null>({
		queryKey: ["mes", "oqc", "detail", oqcId],
		enabled: Boolean(oqcId),
		queryFn: async () => {
			if (!oqcId) return null;
			const response = await client.api.oqc({ oqcId }).get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

/**
 * Get OQC by run number
 */
export function useOqcByRun(runNo: string | undefined, options?: { enabled?: boolean }) {
	return useQuery<OqcDetail | null>({
		queryKey: ["mes", "oqc", "run", runNo],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!runNo) return null;
			const response = await client.api.oqc.run({ runNo }).get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

/**
 * Start OQC inspection
 */
export function useStartOqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (oqcId: string) => {
			const response = await client.api.oqc({ oqcId }).start.post({});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("OQC 检验已开始");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc"] });
		},
		onError: (error: unknown) => showError("开始 OQC 失败", error),
	});
}

/**
 * Record OQC inspection item
 */
export function useRecordOqcItem() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ oqcId, data }: { oqcId: string; data: OqcRecordInput }) => {
			const response = await client.api.oqc({ oqcId }).items.post(data);
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("检验项已记录");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "detail", variables.oqcId] });
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "list"] });
		},
		onError: (error: unknown) => showError("记录检验项失败", error),
	});
}

/**
 * Complete OQC inspection
 */
export function useCompleteOqc() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ oqcId, data }: { oqcId: string; data: OqcCompleteInput }) => {
			const response = await client.api.oqc({ oqcId }).complete.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("OQC 已完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail"] });
		},
		onError: (error: unknown) => showError("完成 OQC 失败", error),
	});
}

/**
 * Record MRB decision for a run
 */
export function useMrbDecision() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ runNo, data }: { runNo: string; data: MrbDecisionInput }) => {
			const response = await client.api.runs({ runNo })["mrb-decision"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("MRB 决策已提交");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc"] });
		},
		onError: (error: unknown) => showError("MRB 决策提交失败", error),
	});
}
