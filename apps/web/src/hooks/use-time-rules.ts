import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

export type TimeRuleListResponse = Awaited<
	ReturnType<(typeof client.api)["time-rules"]["get"]>
>["data"];
export type TimeRuleListData = NonNullable<TimeRuleListResponse>["data"];
export type TimeRuleDefinition = TimeRuleListData["items"][number];

type TimeRuleCreateInput = Parameters<(typeof client.api)["time-rules"]["post"]>[0];
type TimeRuleUpdateInput = Parameters<ReturnType<(typeof client.api)["time-rules"]>["patch"]>[0];

interface TimeRuleListParams {
	page?: number;
	pageSize?: number;
	code?: string;
	name?: string;
	ruleType?: TimeRuleDefinition["ruleType"];
	isActive?: "true" | "false";
	sortBy?:
		| "updatedAt"
		| "name"
		| "createdAt"
		| "code"
		| "ruleType"
		| "durationMinutes"
		| "warningMinutes"
		| "scope"
		| "isActive";
	sortDir?: "asc" | "desc";
}

export function useTimeRuleList(params: TimeRuleListParams = {}, options?: { enabled?: boolean }) {
	return useQuery<TimeRuleListData>({
		queryKey: ["mes", "time-rules", params],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api["time-rules"].get({
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
			return unwrap(response);
		},
	});
}

export function useTimeRule(ruleId: string | undefined, options?: { enabled?: boolean }) {
	return useQuery<TimeRuleDefinition>({
		queryKey: ["mes", "time-rules", ruleId],
		queryFn: async () => {
			if (!ruleId) throw new Error("ruleId is required");
			const response = await client.api["time-rules"]({ ruleId }).get();
			return unwrap(response);
		},
		enabled: Boolean(ruleId) && (options?.enabled ?? true),
	});
}

export function useCreateTimeRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: TimeRuleCreateInput) => {
			const response = await client.api["time-rules"].post(input);
			return unwrap(response);
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
		mutationFn: async ({ ruleId, ...input }: { ruleId: string } & TimeRuleUpdateInput) => {
			const response = await client.api["time-rules"]({ ruleId }).patch(input);
			return unwrap(response);
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
			const response = await client.api["time-rules"]({ ruleId }).delete();
			return unwrap(response);
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
