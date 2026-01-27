import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type ProductionExceptionRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["production-exception-records"]["get"]>
>["data"];
export type ProductionExceptionRecordListData =
	NonNullable<ProductionExceptionRecordListResponse>["data"];
export type ProductionExceptionRecord = ProductionExceptionRecordListData["items"][number];

export type ProductionExceptionRecordQuery = {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
};

type ProductionExceptionCreateInput = Parameters<
	(typeof client.api)["production-exception-records"]["post"]
>[0];
type ProductionExceptionConfirmInput = Parameters<
	ReturnType<(typeof client.api)["production-exception-records"]>["confirm"]["post"]
>[0];

export function useProductionExceptionRecordList(query: ProductionExceptionRecordQuery) {
	return useQuery<ProductionExceptionRecordListData>({
		queryKey: ["mes", "production-exception-records", query],
		queryFn: async () => {
			const response = await client.api["production-exception-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: ProductionExceptionRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateProductionExceptionRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: ProductionExceptionCreateInput) => {
			const response = await client.api["production-exception-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("生产异常记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "production-exception-records"] });
		},
		onError: (error: unknown) => showError("创建生产异常记录失败", error),
	});
}

export function useConfirmProductionExceptionRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: ProductionExceptionConfirmInput }) => {
			const response = await client.api["production-exception-records"]({
				exceptionId: id,
			}).confirm.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("生产异常已确认");
			queryClient.invalidateQueries({ queryKey: ["mes", "production-exception-records"] });
		},
		onError: (error: unknown) => showError("确认生产异常失败", error),
	});
}
