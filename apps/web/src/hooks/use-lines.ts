import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type LineListResponse = Awaited<ReturnType<typeof client.api.lines.get>>["data"];
type LineListData = UnwrapEnvelope<NonNullable<LineListResponse>>;
type LineUpdateInput = Parameters<ReturnType<typeof client.api.lines>["patch"]>[0];

export function useLines(options?: { enabled?: boolean }) {
	return useQuery<LineListData>({
		queryKey: ["mes", "lines"],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api.lines.get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function useUpdateLineProcessType() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			lineId,
			processType,
		}: {
			lineId: string;
			processType: LineUpdateInput["processType"];
		}) => {
			const response = await client.api.lines({ lineId }).patch({ processType });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("产线工艺已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines"] });
			queryClient.invalidateQueries({
				queryKey: ["mes", "lines", variables.lineId, "readiness-config"],
			});
		},
		onError: (error: unknown) => showError("更新产线工艺失败", error),
	});
}
