import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchClient } from "@/lib/api-client";

export type ExecutionConfig = {
	id: string;
	routingId: string | null;
	routingStepId: string | null;
	sourceStepKey: string | null;
	operationId: string | null;
	stationType: string | null;
	stationGroupId: string | null;
	allowedStationIds: unknown;
	requiresFAI: boolean | null;
	requiresAuthorization: boolean | null;
	dataSpecIds: unknown;
	ingestMapping: unknown;
	meta: unknown;
	createdAt: string;
	updatedAt: string;
	routing?: { code: string; name: string } | null;
	routingStep?: { stepNo: number } | null;
	operation?: { code: string; name: string } | null;
	stationGroup?: { code: string; name: string } | null;
};

type ExecutionConfigListResponse = {
	ok: boolean;
	data: {
		items: ExecutionConfig[];
	};
	error?: { code?: string; message?: string };
};

type ExecutionConfigResponse = {
	ok: boolean;
	data: ExecutionConfig;
	error?: { code?: string; message?: string };
};

export type ExecutionConfigCreateInput = {
	scopeType: "ROUTE" | "OPERATION" | "STEP" | "SOURCE_STEP";
	stepNo?: number;
	sourceStepKey?: string;
	operationCode?: string;
	stationType?: string;
	stationGroupCode?: string | null;
	allowedStationIds?: string[] | null;
	requiresFAI?: boolean;
	requiresAuthorization?: boolean;
	dataSpecIds?: string[] | null;
	ingestMapping?: unknown | null;
	meta?: unknown | null;
};

export type ExecutionConfigUpdateInput = Omit<ExecutionConfigCreateInput, "scopeType" | "stepNo" | "sourceStepKey" | "operationCode">;

export function useExecutionConfigs(routingCode: string) {
	return useQuery({
		queryKey: ["mes", "execution-configs", routingCode],
		enabled: Boolean(routingCode),
		queryFn: async () => {
			const response = await fetchClient<ExecutionConfigListResponse>(
				`/routes/${encodeURIComponent(routingCode)}/execution-config`,
			);
			if (!response.ok) {
				throw new Error(response.error?.message || "获取执行配置失败");
			}
			return response.data.items;
		},
		staleTime: 15_000,
	});
}

export function useCreateExecutionConfig(routingCode: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: ExecutionConfigCreateInput) => {
			const response = await fetchClient<ExecutionConfigResponse>(
				`/routes/${encodeURIComponent(routingCode)}/execution-config`,
				{
					method: "POST",
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				throw new Error(response.error?.message || "创建执行配置失败");
			}
			return response.data;
		},
		onSuccess: () => {
			toast.success("执行配置已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "execution-configs", routingCode] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}

export function useUpdateExecutionConfig(routingCode: string, configId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: ExecutionConfigUpdateInput) => {
			const response = await fetchClient<ExecutionConfigResponse>(
				`/routes/${encodeURIComponent(routingCode)}/execution-config/${configId}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				throw new Error(response.error?.message || "更新执行配置失败");
			}
			return response.data;
		},
		onSuccess: () => {
			toast.success("执行配置已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "execution-configs", routingCode] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
