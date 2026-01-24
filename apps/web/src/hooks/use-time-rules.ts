import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

export type TimeRuleDefinition = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	ruleType: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
	durationMinutes: number;
	warningMinutes: number | null;
	startEvent: string;
	endEvent: string;
	scope: "GLOBAL" | "LINE" | "ROUTING" | "PRODUCT";
	scopeValue: string | null;
	requiresWashStep: boolean;
	isWaivable: boolean;
	isActive: boolean;
	priority: number;
	createdAt: string;
	updatedAt: string;
};

interface TimeRuleListParams {
	page?: number;
	pageSize?: number;
	code?: string;
	name?: string;
	ruleType?: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
	isActive?: "true" | "false";
	sortBy?: "updatedAt" | "name" | "createdAt" | "code";
	sortDir?: "asc" | "desc";
}

export function useTimeRuleList(params: TimeRuleListParams = {}, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "time-rules", params],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await client.api["time-rules"].get({
				query: {
					page: params.page ?? 1,
					pageSize: params.pageSize ?? 30,
					code: params.code,
					name: params.name,
					ruleType: params.ruleType,
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

export function useTimeRule(ruleId: string | undefined, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "time-rules", ruleId],
		queryFn: async () => {
			if (!ruleId) throw new Error("ruleId is required");
			const { data, error } = await client.api["time-rules"]({ ruleId }).get();
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载失败");
			}
			return data.data;
		},
		enabled: Boolean(ruleId) && (options?.enabled ?? true),
	});
}

export function useCreateTimeRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			code: string;
			name: string;
			description?: string;
			ruleType: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
			durationMinutes: number;
			warningMinutes?: number | null;
			startEvent: string;
			endEvent: string;
			scope?: "GLOBAL" | "LINE" | "ROUTING" | "PRODUCT";
			scopeValue?: string | null;
			requiresWashStep?: boolean;
			isWaivable?: boolean;
			isActive?: boolean;
			priority?: number;
		}) => {
			const { data, error } = await client.api["time-rules"].post(input as any);
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "time-rules"] });
			toast.success("时间规则创建成功");
		},
		onError: (error) => {
			toast.error(error.message || "创建失败");
		},
	});
}

export function useUpdateTimeRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			ruleId,
			...input
		}: {
			ruleId: string;
			name?: string;
			description?: string;
			ruleType?: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
			durationMinutes?: number;
			warningMinutes?: number | null;
			startEvent?: string;
			endEvent?: string;
			scope?: "GLOBAL" | "LINE" | "ROUTING" | "PRODUCT";
			scopeValue?: string | null;
			requiresWashStep?: boolean;
			isWaivable?: boolean;
			isActive?: boolean;
			priority?: number;
		}) => {
			const { data, error } = await client.api["time-rules"]({ ruleId }).patch(input as any);
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "更新失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "time-rules"] });
			toast.success("时间规则更新成功");
		},
		onError: (error) => {
			toast.error(error.message || "更新失败");
		},
	});
}

export function useDeleteTimeRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (ruleId: string) => {
			const { data, error } = await client.api["time-rules"]({ ruleId }).delete();
			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "删除失败");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mes", "time-rules"] });
			toast.success("时间规则删除成功");
		},
		onError: (error) => {
			toast.error(error.message || "删除失败");
		},
	});
}
