import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;

const executionConfigApi = (code: string) =>
	client.api.routes({ routingCode: code })["execution-config"];
type ExecutionConfigListResponse = Awaited<
	ReturnType<ReturnType<typeof executionConfigApi>["get"]>
>["data"];
type ExecutionConfigListData = UnwrapEnvelope<NonNullable<ExecutionConfigListResponse>>;
export type ExecutionConfig = ExecutionConfigListData["items"][number];

type ExecutionConfigCreateInput = Parameters<ReturnType<typeof executionConfigApi>["post"]>[0];
export type { ExecutionConfigCreateInput };

const executionConfigDetailApi = (code: string, configId: string) =>
	client.api.routes({ routingCode: code })["execution-config"]({ configId });
type ExecutionConfigUpdateInput = Parameters<
	ReturnType<typeof executionConfigDetailApi>["patch"]
>[0];
export type { ExecutionConfigUpdateInput };

export function useExecutionConfigs(routingCode: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "execution-configs", routingCode],
		enabled: Boolean(routingCode) && (options?.enabled ?? true),
		queryFn: async () => {
			const response = await client.api.routes({ routingCode })["execution-config"].get();
			const data = unwrap(response);
			return data.items;
		},
		staleTime: 15_000,
	});
}

export function useCreateExecutionConfig(routingCode: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: ExecutionConfigCreateInput) => {
			const response = await client.api.routes({ routingCode })["execution-config"].post(payload);
			return unwrap(response);
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
			const response = await client.api
				.routes({ routingCode })
				["execution-config"]({ configId })
				.patch(payload);
			return unwrap(response);
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
