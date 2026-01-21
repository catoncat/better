import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
export type SlotMappingsResponse = Awaited<
	ReturnType<(typeof client.api)["slot-mappings"]["get"]>
>["data"];
export type SlotMappingsData = NonNullable<SlotMappingsResponse>["data"];
export type SlotMapping = SlotMappingsData["items"][number];

export type SlotMappingQuery = {
	lineId?: string;
	slotId?: string;
	productCode?: string;
	routingId?: string;
};

type SlotMappingQueryOptions = { enabled?: boolean };

type CreateSlotMappingInput = {
	slotId: string;
	materialCode: string;
	productCode?: string;
	routingId?: string;
	priority?: number;
	isAlternate?: boolean;
	unitConsumption?: number;
	isCommonMaterial?: boolean;
};

type UpdateSlotMappingInput = {
	materialCode?: string;
	productCode?: string | null;
	routingId?: string | null;
	priority?: number;
	isAlternate?: boolean;
	unitConsumption?: number | null;
	isCommonMaterial?: boolean;
};

/**
 * List slot material mappings with optional filters
 */
export function useSlotMappings(query: SlotMappingQuery, options?: SlotMappingQueryOptions) {
	return useQuery<SlotMappingsData>({
		queryKey: ["mes", "loading", "slot-mappings", query],
		queryFn: async () => {
			const response = await client.api["slot-mappings"].get({ query });
			return unwrap(response);
		},
		enabled: options?.enabled ?? true,
		placeholderData: (previousData: SlotMappingsData | undefined) => previousData,
		staleTime: 10_000,
	});
}

/**
 * Create a slot material mapping
 */
export function useCreateSlotMapping() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateSlotMappingInput) => {
			const response = await client.api["slot-mappings"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("物料映射已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "slot-mappings"] });
		},
	});
}

/**
 * Update a slot material mapping
 */
export function useUpdateSlotMapping() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateSlotMappingInput }) => {
			const response = await client.api["slot-mappings"]({ id }).put(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("物料映射已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "slot-mappings"] });
		},
	});
}

/**
 * Delete a slot material mapping
 */
export function useDeleteSlotMapping() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await client.api["slot-mappings"]({ id }).delete();
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("物料映射已删除");
			queryClient.invalidateQueries({ queryKey: ["mes", "loading", "slot-mappings"] });
		},
	});
}
