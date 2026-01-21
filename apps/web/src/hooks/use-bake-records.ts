import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type BakeRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["bake-records"]["get"]>
>["data"];
export type BakeRecordListData = NonNullable<BakeRecordListResponse>["data"];
export type BakeRecord = BakeRecordListData["items"][number];

export type BakeRecordQuery = {
	runNo?: string;
	itemCode?: string;
	bakeProcess?: string;
	materialCode?: string;
	lotNo?: string;
	inFrom?: string;
	inTo?: string;
	page?: number;
	pageSize?: number;
};

type BakeRecordCreateInput = Parameters<(typeof client.api)["bake-records"]["post"]>[0];

export function useBakeRecordList(query: BakeRecordQuery, options?: { enabled?: boolean }) {
	return useQuery<BakeRecordListData>({
		queryKey: ["mes", "bake-records", query],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api["bake-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: BakeRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateBakeRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: BakeRecordCreateInput) => {
			const response = await client.api["bake-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("烘烤记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "bake-records"] });
		},
		onError: (error: unknown) => showError("创建烘烤记录失败", error),
	});
}
