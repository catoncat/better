import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, getApiErrorMessage } from "@/lib/api-error";
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
	loadedAt: string;
	loadedBy: string;
	unloadedAt: string | null;
	unloadedBy: string | null;
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

/**
 * Get loading expectations for a run
 */
export function useLoadingExpectations(runNo: string | undefined) {
	return useQuery<LoadingExpectation[]>({
		queryKey: ["mes", "loading", "expectations", runNo],
		enabled: Boolean(runNo),
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
export function useLoadingRecords(runNo: string | undefined) {
	return useQuery<LoadingRecord[]>({
		queryKey: ["mes", "loading", "records", runNo],
		enabled: Boolean(runNo),
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

	return useMutation({
		mutationFn: async (runNo: string) => {
			const response = await client.api.runs({ runNo }).loading["load-table"].post({});
			return unwrap(response);
		},
		onSuccess: (_data, runNo) => {
			toast.success("站位表加载成功");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "expectations", runNo] });
		},
		onError: (error: unknown) => {
			toast.error("站位表加载失败", {
				description: getApiErrorMessage(error, "请重试或联系管理员"),
			});
		},
	});
}

/**
 * Verify loading (Scan)
 */
export function useVerifyLoading() {
	const queryClient = useQueryClient();

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

				toast.error("上料验证失败", {
					description: error.message
						? `${error.message}${error.code ? `（${error.code}）` : ""}`
						: error.code,
				});
				return;
			}

			if (error && typeof error === "object" && "message" in error) {
				const message = (error as { message?: unknown }).message;
				toast.error("上料验证失败", {
					description: typeof message === "string" ? message : undefined,
				});
				return;
			}

			toast.error("上料验证失败", {
				description: "请重试或联系管理员",
			});
		},
	});
}

/**
 * Replace loading
 */
export function useReplaceLoading() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: ReplaceLoadingInput) => {
			const response = await client.api.loading.replace.post(data);
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("换料成功");
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "expectations", variables.runNo],
			});
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "records", variables.runNo],
			});
		},
		onError: (error: unknown) => {
			toast.error("换料失败", {
				description: getApiErrorMessage(error, "请重试或联系管理员"),
			});
		},
	});
}

/**
 * Unlock slot
 */
export function useUnlockSlot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ slotId, reason }: { slotId: string; reason: string }) => {
			const response = await client.api["feeder-slots"]({ slotId }).unlock.post({ reason });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("站位已解锁");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading"] });
		},
		onError: (error: unknown) => {
			toast.error("解锁失败", {
				description: getApiErrorMessage(error, "请重试或联系管理员"),
			});
		},
	});
}
