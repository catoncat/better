import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { ApiError } from "@/lib/api-error";
import { client, unwrap } from "@/lib/eden";

export type LoadingExpectation = {
	id: string;
	slotId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	isLocked: boolean;
	expectedMaterialCode: string;
	alternates: string[];
	status: "PENDING" | "LOADED" | "MISMATCH";
	loadedMaterialCode: string | null;
	loadedAt: string | null;
	loadedBy: string | null;
};

export type LoadingRecord = {
	id: string;
	runNo: string;
	slotId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	materialLotId: string;
	lotNo: string;
	materialCode: string;
	expectedCode: string | null;
	status: "LOADED" | "UNLOADED" | "REPLACED";
	verifyResult: "PASS" | "FAIL" | "WARNING";
	failReason: string | null;
	isIdempotent?: boolean;
	packageQty: number | null;
	reviewedBy: string | null;
	reviewedAt: string | null;
	loadedAt: string;
	loadedBy: string;
	unloadedAt: string | null;
	unloadedBy: string | null;
	// Phase 1: 物料校验信息
	materialKnown?: boolean;
	materialName?: string | null;
	// Phase 2: 物料校验状态（持久化）
	materialValidation?: string | null;
};

export type FeederSlot = {
	id: string;
	lineId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	currentMaterialLotId: string | null;
	isLocked: boolean;
	failedAttempts: number;
	lockedAt: string | null;
	lockedReason: string | null;
};

type VerifyLoadingInput = Parameters<typeof client.api.loading.verify.post>[0];
type ReplaceLoadingInput = Parameters<typeof client.api.loading.replace.post>[0];
type LoadingQueryOptions = { enabled?: boolean };

/**
 * Get loading expectations for a run
 */
export function useLoadingExpectations(runNo: string | undefined, options?: LoadingQueryOptions) {
	return useQuery<LoadingExpectation[]>({
		queryKey: ["mes", "loading", "expectations", runNo],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!runNo) return [];
			const response = await client.api.runs({ runNo }).loading.expectations.get();
			return (unwrap(response).items ?? []) as LoadingExpectation[];
		},
		staleTime: 5000,
	});
}

/**
 * Get current loading records for a run
 */
export function useLoadingRecords(runNo: string | undefined, options?: LoadingQueryOptions) {
	return useQuery<LoadingRecord[]>({
		queryKey: ["mes", "loading", "records", runNo],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!runNo) return [];
			const response = await client.api.runs({ runNo }).loading.get();
			return (unwrap(response).items ?? []) as LoadingRecord[];
		},
		staleTime: 5000,
	});
}

/**
 * Initialize slot table for a run
 */
export function useLoadTable() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (runNo: string) => {
			const response = await client.api.runs({ runNo }).loading["load-table"].post({});
			return unwrap(response);
		},
		onSuccess: (_data, runNo) => {
			toast.success("站位表加载成功");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "expectations", runNo] });
		},
		onError: (error: unknown) => showError("站位表加载失败", error),
	});
}

/**
 * Verify loading (Scan)
 */
export function useVerifyLoading() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: VerifyLoadingInput) => {
			const response = await client.api.loading.verify.post(data);
			return unwrap(response);
		},
		onSuccess: (data, variables) => {
			if (data.isIdempotent) {
				toast.success("已上料（重复扫描）");
			} else if (data.verifyResult === "PASS") {
				toast.success("上料验证通过");
			} else if (data.verifyResult === "WARNING") {
				toast.warning("上料验证警告");
			}
			// Phase 1: 物料校验警告
			if (data.materialKnown === false) {
				toast.warning("物料编码未在主数据中", {
					description: `物料 ${data.materialCode} 不在 ERP 物料主数据中，请核实`,
				});
			}
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "expectations", variables.runNo],
			});
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "records", variables.runNo],
			});
		},
		onError: (error: unknown) => {
			if (error instanceof ApiError) {
				if (error.code === "SLOT_LOCKED") {
					toast.error("站位已锁定", {
						description: error.message || "站位已锁定，请先解锁",
					});
					return;
				}
			}
			showError("上料验证失败", error);
		},
	});
}

/**
 * Replace loading
 */
export function useReplaceLoading() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: ReplaceLoadingInput) => {
			const response = await client.api.loading.replace.post(data);
			return unwrap(response);
		},
		onSuccess: (data, variables) => {
			toast.success("换料成功");
			// Phase 1: 物料校验警告
			if (data.materialKnown === false) {
				toast.warning("物料编码未在主数据中", {
					description: `物料 ${data.materialCode} 不在 ERP 物料主数据中，请核实`,
				});
			}
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "expectations", variables.runNo],
			});
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "records", variables.runNo],
			});
		},
		onError: (error: unknown) => showError("换料失败", error),
	});
}

/**
 * Unlock slot
 */
export function useUnlockSlot() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ slotId, reason }: { slotId: string; reason: string }) => {
			const response = await client.api["feeder-slots"]({ slotId }).unlock.post({ reason });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("站位已解锁");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading"] });
		},
		onError: (error: unknown) => showError("解锁失败", error),
	});
}
