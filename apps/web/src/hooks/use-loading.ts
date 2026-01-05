import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Infer types
export type LoadingExpectationsResponse = Awaited<
	ReturnType<typeof client.api.runs[":runNo"]["loading"]["expectations"]["get"]>
>["data"];
export type LoadingExpectation = NonNullable<LoadingExpectationsResponse>["data"]["items"][number];

export type LoadingRecordsResponse = Awaited<
	ReturnType<typeof client.api.runs[":runNo"]["loading"]["get"]>
>["data"];
export type LoadingRecord = NonNullable<LoadingRecordsResponse>["data"]["items"][number];

export type FeederSlotsResponse = Awaited<
	ReturnType<typeof client.api.lines[":lineId"]["feeder-slots"]["get"]>
>["data"];
export type FeederSlot = NonNullable<FeederSlotsResponse>["data"]["items"][number];

type VerifyLoadingInput = Parameters<typeof client.api.loading.verify.post>[0];
type ReplaceLoadingInput = Parameters<typeof client.api.loading.replace.post>[0];
type UnlockSlotInput = Parameters<
	typeof client.api["feeder-slots"][":slotId"]["unlock"]["post"]
>[0];

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
			return unwrap(response).data.items;
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
			return unwrap(response).data.items;
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
			if (data.data.verifyResult === "PASS") {
				toast.success("上料验证通过");
			} else if (data.data.verifyResult === "WARNING") {
				toast.warning("上料验证警告");
			}
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "expectations", variables.runNo],
			});
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "records", variables.runNo],
			});
		},
		onError: (error: any) => {
			// Specific error handling for slot locks
			if (error?.code === "SLOT_LOCKED") {
				toast.error("站位已锁定", { description: error.message });
			}
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
	});
}
