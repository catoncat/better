import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

// Infer types from API responses
type DefectListResponse = Awaited<ReturnType<typeof client.api.defects.get>>["data"];
export type DefectListData = NonNullable<DefectListResponse>["data"];
export type Defect = DefectListData["items"][number];

type DefectDetailResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.defects>["get"]>
>["data"];
export type DefectDetail = NonNullable<DefectDetailResponse>["data"];

export type DefectQuery = {
	unitSn?: string;
	runNo?: string;
	status?: string;
	code?: string;
	page?: number;
	pageSize?: number;
};

/**
 * List defects with filters
 */
export function useDefectList(query: DefectQuery) {
	return useQuery<DefectListData | null>({
		queryKey: ["mes", "defects", "list", query],
		queryFn: async () => {
			const response = await client.api.defects.get({ query });

			if (response.error) {
				throw new Error("Failed to fetch defects list");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: DefectListData };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Get defect by ID
 */
export function useDefectDetail(defectId: string | undefined) {
	return useQuery<DefectDetail | null>({
		queryKey: ["mes", "defects", "detail", defectId],
		enabled: Boolean(defectId),
		queryFn: async () => {
			if (!defectId) throw new Error("No defect ID");
			const response = await client.api.defects({ defectId }).get();

			if (response.error) {
				throw new Error("Failed to fetch defect");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: DefectDetail };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Create defect
 */
export function useCreateDefect() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: {
			unitSn: string;
			code: string;
			location?: string;
			qty?: number;
			remark?: string;
		}) => {
			const response = await client.api.defects.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("缺陷已记录");
			queryClient.invalidateQueries({ queryKey: ["mes", "defects"] });
		},
		onError: (error: unknown) => showError("记录缺陷失败", error),
	});
}

/**
 * Assign disposition to defect
 */
export function useAssignDisposition() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({
			defectId,
			data,
		}: {
			defectId: string;
			data: {
				type: "REWORK" | "SCRAP" | "HOLD";
				reason?: string;
				toStepNo?: number;
			};
		}) => {
			const response = await client.api.defects({ defectId }).disposition.post(data);
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("处置已分配");
			queryClient.invalidateQueries({ queryKey: ["mes", "defects", "detail", variables.defectId] });
			queryClient.invalidateQueries({ queryKey: ["mes", "defects", "list"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "rework-tasks"] });
		},
		onError: (error: unknown) => showError("分配处置失败", error),
	});
}

/**
 * Release hold on defect
 */
export function useReleaseHold() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ defectId, reason }: { defectId: string; reason: string }) => {
			const response = await client.api.defects({ defectId }).release.post({ reason });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("已解除隔离");
			queryClient.invalidateQueries({ queryKey: ["mes", "defects", "detail", variables.defectId] });
			queryClient.invalidateQueries({ queryKey: ["mes", "defects", "list"] });
		},
		onError: (error: unknown) => showError("解除隔离失败", error),
	});
}

// Rework task types
type ReworkListResponse = Awaited<ReturnType<(typeof client.api)["rework-tasks"]["get"]>>["data"];
export type ReworkListData = NonNullable<ReworkListResponse>["data"];
export type ReworkTask = ReworkListData["items"][number];

export type ReworkQuery = {
	unitSn?: string;
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
};

/**
 * List rework tasks
 */
export function useReworkTaskList(query: ReworkQuery) {
	return useQuery<ReworkListData | null>({
		queryKey: ["mes", "rework-tasks", "list", query],
		queryFn: async () => {
			const response = await client.api["rework-tasks"].get({ query });

			if (response.error) {
				throw new Error("Failed to fetch rework tasks");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: ReworkListData };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

/**
 * Complete rework task
 */
export function useCompleteRework() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ taskId, remark }: { taskId: string; remark?: string }) => {
			const response = await client.api["rework-tasks"]({ taskId }).complete.post({
				remark,
			});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("返工已完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "rework-tasks"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "defects"] });
		},
		onError: (error: unknown) => showError("完成返工失败", error),
	});
}
