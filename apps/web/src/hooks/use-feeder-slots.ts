import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
// Note: For dynamic routes like lines/:lineId, we use ReturnType<typeof fn> pattern
export type FeederSlotsResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.lines>["feeder-slots"]["get"]>
>["data"];
export type FeederSlotsData = NonNullable<FeederSlotsResponse>["data"];
export type FeederSlot = FeederSlotsData["items"][number];

type CreateFeederSlotInput = {
	slotCode: string;
	slotName?: string;
	position: number;
};

type UpdateFeederSlotInput = {
	slotCode?: string;
	slotName?: string;
	position?: number;
};

type FeederSlotQueryOptions = { enabled?: boolean };

/**
 * List feeder slots for a line
 */
export function useFeederSlots(lineId: string | undefined, options?: FeederSlotQueryOptions) {
	return useQuery<FeederSlotsData>({
		queryKey: ["mes", "loading", "feeder-slots", lineId],
		queryFn: async () => {
			if (!lineId) throw new Error("lineId is required");
			const response = await client.api.lines({ lineId })["feeder-slots"].get();
			return unwrap(response);
		},
		enabled: Boolean(lineId) && (options?.enabled ?? true),
		staleTime: 10_000,
	});
}

/**
 * Create a feeder slot
 */
export function useCreateFeederSlot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId, data }: { lineId: string; data: CreateFeederSlotInput }) => {
			const response = await client.api.lines({ lineId })["feeder-slots"].post(data);
			return unwrap(response);
		},
		onSuccess: (_, variables) => {
			toast.success("站位已创建");
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "feeder-slots", variables.lineId],
			});
		},
	});
}

/**
 * Update a feeder slot
 */
export function useUpdateFeederSlot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			lineId,
			slotId,
			data,
		}: {
			lineId: string;
			slotId: string;
			data: UpdateFeederSlotInput;
		}) => {
			const response = await client.api.lines({ lineId })["feeder-slots"]({ slotId }).put(data);
			return unwrap(response);
		},
		onSuccess: (_, variables) => {
			toast.success("站位已更新");
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "feeder-slots", variables.lineId],
			});
		},
	});
}

/**
 * Delete a feeder slot
 */
export function useDeleteFeederSlot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId, slotId }: { lineId: string; slotId: string }) => {
			const response = await client.api.lines({ lineId })["feeder-slots"]({ slotId }).delete();
			return unwrap(response);
		},
		onSuccess: (_, variables) => {
			toast.success("站位已删除");
			queryClient.invalidateQueries({
				queryKey: ["mes", "loading", "feeder-slots", variables.lineId],
			});
		},
	});
}

/**
 * Unlock a locked feeder slot
 */
export function useUnlockFeederSlot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ slotId, reason }: { slotId: string; reason: string }) => {
			const response = await client.api["feeder-slots"]({ slotId }).unlock.post({ reason });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("站位已解锁");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "feeder-slots"] });
		},
	});
}
