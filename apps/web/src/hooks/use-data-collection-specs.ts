import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

export type DataCollectionSpec = {
	id: string;
	operationId: string;
	operationCode: string;
	operationName: string;
	name: string;
	itemType: "KEY" | "OBSERVATION";
	dataType: "NUMBER" | "TEXT" | "BOOLEAN" | "JSON";
	method: "AUTO" | "MANUAL";
	triggerType: "EVENT" | "TIME" | "EACH_UNIT" | "EACH_CARRIER";
	triggerRule: unknown | null;
	spec: unknown | null;
	alarm: unknown | null;
	isRequired: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

interface DataCollectionSpecListParams {
	page?: number;
	pageSize?: number;
	operationCode?: string;
	name?: string;
	isActive?: "true" | "false";
	sortBy?: "updatedAt" | "name" | "createdAt";
	sortDir?: "asc" | "desc";
}

export function useDataCollectionSpecList(
	params: DataCollectionSpecListParams = {},
	options?: { enabled?: boolean },
) {
	return useQuery({
		queryKey: ["mes", "data-collection-specs", params],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await client.api["data-collection-specs"].get({
				query: {
					page: params.page ?? 1,
					pageSize: params.pageSize ?? 30,
					operationCode: params.operationCode,
					name: params.name,
					isActive: params.isActive,
					sortBy: params.sortBy,
					sortDir: params.sortDir,
				},
			});
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载失败");
			}
			return data.data;
		},
	});
}

export function useDataCollectionSpec(specId: string | undefined, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "data-collection-specs", specId],
		queryFn: async () => {
			if (!specId) throw new Error("specId is required");
			const { data, error } = await client.api["data-collection-specs"]({ specId }).get();
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载失败");
			}
			return data.data;
		},
		enabled: Boolean(specId) && (options?.enabled ?? true),
	});
}

export function useCreateDataCollectionSpec() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			operationCode: string;
			name: string;
			itemType: "KEY" | "OBSERVATION";
			dataType: "NUMBER" | "TEXT" | "BOOLEAN" | "JSON";
			method: "AUTO" | "MANUAL";
			triggerType: "EVENT" | "TIME" | "EACH_UNIT" | "EACH_CARRIER";
			triggerRule?: unknown;
			spec?: unknown;
			alarm?: unknown;
			isRequired?: boolean;
			isActive?: boolean;
		}) => {
			const { data, error } = await client.api["data-collection-specs"].post(input);
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "data-collection-specs"] });
			toast.success("采集项创建成功");
		},
		onError: (error) => {
			toast.error(error.message || "创建失败");
		},
	});
}

export function useUpdateDataCollectionSpec() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			specId,
			...input
		}: {
			specId: string;
			name?: string;
			itemType?: "KEY" | "OBSERVATION";
			dataType?: "NUMBER" | "TEXT" | "BOOLEAN" | "JSON";
			method?: "AUTO" | "MANUAL";
			triggerType?: "EVENT" | "TIME" | "EACH_UNIT" | "EACH_CARRIER";
			triggerRule?: unknown;
			spec?: unknown;
			alarm?: unknown;
			isRequired?: boolean;
			isActive?: boolean;
		}) => {
			const { data, error } = await client.api["data-collection-specs"]({ specId }).patch(input);
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "更新失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "data-collection-specs"] });
			toast.success("采集项更新成功");
		},
		onError: (error) => {
			toast.error(error.message || "更新失败");
		},
	});
}
