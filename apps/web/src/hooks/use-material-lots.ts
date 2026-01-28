import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type MaterialLotListItem = {
	id: string;
	materialCode: string;
	lotNo: string;
	supplier: string | null;
	iqcResult: string | null;
	iqcDate: string | null;
	createdAt: string;
	updatedAt: string;
	materialName?: string | null;
	materialKnown: boolean;
};

export type MaterialLotUsageRecord = {
	type: "loading" | "bake";
	id: string;
	runNo: string | null;
	slotCode?: string | null;
	createdAt: string;
	operator: string | null;
};

type MaterialLotListQuery = {
	materialCode?: string;
	lotNo?: string;
	supplier?: string;
	iqcResult?: string;
	hasIqc?: "true" | "false";
	materialKnown?: "true" | "false";
	createdAfter?: string;
	createdBefore?: string;
	offset?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
};

export function useMaterialLotList(query: MaterialLotListQuery = {}) {
	return useQuery({
		queryKey: ["mes", "material-lots", query],
		queryFn: async () => {
			const response = await client.api["material-lots"].get({ query });
			const data = unwrap(response);
			return data as {
				items: MaterialLotListItem[];
				total: number;
				offset: number;
				limit: number;
			};
		},
		staleTime: 30000,
	});
}

export function useMaterialLot(id: string | undefined) {
	return useQuery({
		queryKey: ["mes", "material-lots", id],
		enabled: !!id,
		queryFn: async () => {
			if (!id) return null;
			const response = await client.api["material-lots"]({ id }).get();
			return unwrap(response) as MaterialLotListItem;
		},
	});
}

export function useMaterialLotUsage(id: string | undefined) {
	return useQuery({
		queryKey: ["mes", "material-lots", id, "usage"],
		enabled: !!id,
		queryFn: async () => {
			if (!id) return { items: [] };
			const response = await client.api["material-lots"]({ id }).usage.get();
			return unwrap(response) as { items: MaterialLotUsageRecord[] };
		},
	});
}

export function useUpdateMaterialLot() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: { supplier?: string | null; iqcResult?: string | null; iqcDate?: string | null };
		}) => {
			const response = await client.api["material-lots"]({ id }).patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("物料批次更新成功");
			queryClient.invalidateQueries({ queryKey: ["mes", "material-lots"] });
		},
		onError: (error: unknown) => showError("更新失败", error),
	});
}

export function useCreateMaterialLot() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: { materialCode: string; lotNo: string }) => {
			const response = await client.api["material-lots"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("物料批次创建成功");
			queryClient.invalidateQueries({ queryKey: ["mes", "material-lots"] });
		},
		onError: (error: unknown) => showError("创建失败", error),
	});
}
