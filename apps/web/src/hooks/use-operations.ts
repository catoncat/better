import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

export type Operation = {
	id: string;
	code: string;
	name: string;
	defaultType: "MANUAL" | "AUTO" | "BATCH" | "TEST";
	isKeyQuality: boolean;
	meta: unknown | null;
	source: "ERP" | "MES" | "SEED";
	createdAt: string;
	updatedAt: string;
};

interface OperationListParams {
	page?: number;
	pageSize?: number;
	code?: string;
	name?: string;
	source?: "ERP" | "MES" | "SEED";
	defaultType?: "MANUAL" | "AUTO" | "BATCH" | "TEST";
	sortBy?: "updatedAt" | "code" | "name" | "createdAt";
	sortDir?: "asc" | "desc";
}

export function useOperationList(params: OperationListParams = {}, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "operations", params],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await client.api.operations.get({
				query: {
					page: params.page ?? 1,
					pageSize: params.pageSize ?? 100, // Operations are usually small, fetch all
					code: params.code,
					name: params.name,
					source: params.source,
					defaultType: params.defaultType,
					sortBy: params.sortBy ?? "code",
					sortDir: params.sortDir ?? "asc",
				},
			});
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载失败");
			}
			return data.data;
		},
	});
}

export function useCreateOperation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			code: string;
			name: string;
			defaultType: "MANUAL" | "AUTO" | "BATCH" | "TEST";
			isKeyQuality?: boolean;
			meta?: unknown;
		}) => {
			const { data, error } = await client.api.operations.post(input);
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "operations"] });
			toast.success("工序创建成功");
		},
		onError: (error) => {
			toast.error(error.message || "创建失败");
		},
	});
}
