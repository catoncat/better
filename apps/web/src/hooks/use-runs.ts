import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { ApiError } from "@/lib/api-error";
import { client, unwrap } from "@/lib/eden";

// Infer types from the API using Eden Treaty
type ApiRunResponse = Awaited<ReturnType<typeof client.api.runs.get>>["data"];
export type Run = NonNullable<ApiRunResponse>["items"][number];
export type RunList = Exclude<ApiRunResponse, { code: string; message: string } | null | undefined>;

const runDetailApi = (runNo: string) => client.api.runs({ runNo });
type RunDetailResponse = Awaited<ReturnType<ReturnType<typeof runDetailApi>["get"]>>["data"];
export type RunDetail = NonNullable<RunDetailResponse>;

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
const runUnitsApi = (runNo: string) => client.api.runs({ runNo }).units;
type RunUnitsEnvelope = Awaited<ReturnType<ReturnType<typeof runUnitsApi>["get"]>>["data"];
export type RunUnitList = UnwrapEnvelope<NonNullable<RunUnitsEnvelope>>;
export type RunUnitItem = RunUnitList["items"][number];

type RunCreateInput = Parameters<ReturnType<(typeof client.api)["work-orders"]>["runs"]["post"]>[0];
type RunAuthorizeInput = Parameters<ReturnType<typeof client.api.runs>["authorize"]["post"]>[0];

interface UseRunListParams {
	page?: number;
	pageSize?: number;
	status?: string | string[];
	search?: string;
	sort?: string;
	woNo?: string;
	lineCode?: string;
}

export function useRunList(params: UseRunListParams, options?: { enabled?: boolean }) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const status = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "");
	const search = params.search ?? "";
	const sort = params.sort ?? "";
	const woNo = params.woNo ?? "";
	const lineCode = params.lineCode ?? "";

	return useQuery<RunList>({
		queryKey: ["mes", "runs", page, pageSize, search, status, sort, woNo, lineCode],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await client.api.runs.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					status: status || undefined,
					sort: sort || undefined,
					woNo: woNo || undefined,
					lineCode: lineCode || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			if (!data) {
				throw new Error("No data received");
			}

			return data;
		},
		placeholderData: (previousData: RunList | undefined) => previousData,
		staleTime: 30_000,
	});
}

export function useRunDetail(runNo: string, options?: { enabled?: boolean }) {
	return useQuery<RunDetail>({
		queryKey: ["mes", "run-detail", runNo],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			const response = await client.api.runs({ runNo }).get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function useRunUnits(
	params: {
		runNo: string | undefined;
		status?: string;
		stationCode?: string;
		page?: number;
		pageSize?: number;
	},
	options?: { enabled?: boolean },
) {
	const { runNo, status, stationCode, page = 1, pageSize = 50 } = params;
	return useQuery<RunUnitList>({
		queryKey: ["mes", "run-units", runNo, status, stationCode, page, pageSize],
		enabled: Boolean(runNo) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!runNo) {
				throw new Error("Run number is required");
			}
			const response = await runUnitsApi(runNo).get({
				query: {
					status: status || undefined,
					stationCode: stationCode || undefined,
					page,
					pageSize,
				},
			});
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function useCreateRun() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ woNo, ...body }: RunCreateInput & { woNo: string }) => {
			const response = await client.api["work-orders"]({ woNo }).runs.post(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("生产批次已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "work-orders"] });
		},
		onError: (error: unknown) => showError("创建批次失败", error),
	});
}

export function useAuthorizeRun() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ runNo, ...body }: RunAuthorizeInput & { runNo: string }) => {
			const response = await client.api.runs({ runNo }).authorize.post(body);
			return unwrap(response);
		},
		onSuccess: (_data, { runNo }) => {
			toast.success("授权状态已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", runNo] });
		},
		onError: (error: unknown) => showError("授权失败", error),
	});
}

export function useCloseRun() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ runNo }: { runNo: string }) => {
			const response = await client.api.runs({ runNo }).close.post();
			return unwrap(response);
		},
		onSuccess: (_data, { runNo }) => {
			toast.success("批次已收尾");
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", runNo] });
		},
		onError: (error: unknown, { runNo }) => {
			// OQC_REQUIRED 不是失败，而是状态转移：已触发 OQC，等待质量完成
			if (error instanceof ApiError && error.code === "OQC_REQUIRED") {
				toast.info("已触发出货检验 (OQC)，等待质量完成后可收尾", {
					duration: 5000,
					description: "请在下方 OQC 区域查看检验状态",
				});
				queryClient.invalidateQueries({ queryKey: ["mes", "oqc", "run", runNo] });
				queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", runNo] });
				return; // 不走 showError
			}
			showError("收尾失败", error);
		},
	});
}

export function useGenerateUnits() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			runNo,
			quantity,
			snPrefix,
		}: {
			runNo: string;
			quantity: number;
			snPrefix?: string;
		}) => {
			const response = await client.api.runs({ runNo })["generate-units"].post({
				quantity,
				snPrefix,
			});
			return unwrap(response);
		},
		onSuccess: (_data, { runNo }) => {
			toast.success(`已生成 ${_data.generated} 个单件`);
			queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", runNo] });
		},
		onError: (error: unknown) => showError("生成单件失败", error),
	});
}
