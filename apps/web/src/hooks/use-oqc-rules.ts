import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
export type OqcRuleListResponse = Awaited<
	ReturnType<typeof client.api.oqc["sampling-rules"]["get"]>
>["data"];
export type OqcRuleListData = NonNullable<OqcRuleListResponse>["data"];
export type OqcSamplingRule = OqcRuleListData["items"][number];

export type OqcRuleQuery = {
	productCode?: string;
	lineId?: string;
	routingId?: string;
	isActive?: string;
	page?: number;
	pageSize?: number;
};

type CreateRuleInput = Parameters<
	typeof client.api.oqc["sampling-rules"]["post"]
>[0];
type UpdateRuleInput = Parameters<
	ReturnType<typeof client.api.oqc["sampling-rules"]>["patch"]
>[0];

/**
 * List OQC sampling rules
 */
export function useOqcRuleList(query: OqcRuleQuery) {
	return useQuery<OqcRuleListData>({
		queryKey: ["mes", "oqc", "rules", query],
		queryFn: async () => {
			const response = await client.api.oqc["sampling-rules"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: OqcRuleListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

/**
 * Create OQC sampling rule
 */
export function useCreateOqcRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateRuleInput) => {
			const response = await client.api.oqc["sampling-rules"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("规则已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "rules"] });
		},
	});
}

/**
 * Update OQC sampling rule
 */
export function useUpdateOqcRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ ruleId, data }: { ruleId: string; data: UpdateRuleInput }) => {
			const response = await client.api.oqc["sampling-rules"]({ ruleId }).patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("规则已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "rules"] });
		},
	});
}

/**
 * Delete (deactivate) OQC sampling rule
 */
export function useDeleteOqcRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (ruleId: string) => {
			const response = await client.api.oqc["sampling-rules"]({ ruleId }).delete();
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("规则已停用");
			queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "rules"] });
		},
	});
}
