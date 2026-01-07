import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type ReadinessCheckResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.runs>["readiness"]["latest"]["get"]>
>["data"];

export type ReadinessCheck = NonNullable<ReadinessCheckResponse>["data"];

type ReadinessCheckItem = NonNullable<ReadinessCheck>["items"][number];

export type { ReadinessCheckItem };

// Readiness config types
type ReadinessConfigResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.lines>["readiness-config"]["get"]>
>["data"];

export type ReadinessConfig = NonNullable<ReadinessConfigResponse>["data"];
export type ReadinessItemType = ReadinessConfig["enabled"][number];

export const ALL_READINESS_ITEM_TYPES: ReadinessItemType[] = [
	"EQUIPMENT",
	"MATERIAL",
	"ROUTE",
	"STENCIL",
	"SOLDER_PASTE",
	"LOADING",
];

export const READINESS_ITEM_TYPE_LABELS: Record<ReadinessItemType, string> = {
	EQUIPMENT: "设备检查",
	MATERIAL: "物料检查",
	ROUTE: "路由检查",
	STENCIL: "钢网检查",
	SOLDER_PASTE: "锡膏检查",
	LOADING: "上料检查",
};

export function useReadinessConfig(lineId: string | undefined) {
	return useQuery({
		queryKey: ["mes", "lines", lineId, "readiness-config"],
		enabled: Boolean(lineId),
		queryFn: async () => {
			if (!lineId) throw new Error("lineId required");
			const response = await client.api.lines({ lineId })["readiness-config"].get();
			return unwrap(response);
		},
		staleTime: 30_000,
	});
}

export function useUpdateReadinessConfig() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId, enabled }: { lineId: string; enabled: ReadinessItemType[] }) => {
			const response = await client.api.lines({ lineId })["readiness-config"].put({ enabled });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("配置已保存");
			queryClient.invalidateQueries({ queryKey: ["mes", "lines", variables.lineId, "readiness-config"] });
		},
		onError: () => {
			toast.error("保存配置失败");
		},
	});
}

export function useReadinessLatest(runNo: string, type?: "PRECHECK" | "FORMAL") {
	return useQuery<ReadinessCheck | null>({
		queryKey: ["mes", "readiness", runNo, "latest", type],
		enabled: Boolean(runNo),
		queryFn: async () => {
			const response = await client.api.runs({ runNo }).readiness.latest.get({ query: { type } });

			if (response.error) {
				const errorVal = response.error.value as { error?: { code?: string } } | undefined;
				if (errorVal?.error?.code === "NO_CHECK_FOUND") {
					return null;
				}
				throw new Error("Failed to fetch readiness check");
			}

			if (!response.data) return null;

			const data = response.data as { ok: boolean; data?: ReadinessCheck };
			return data.ok ? (data.data ?? null) : null;
		},
		staleTime: 10_000,
	});
}

export function useReadinessHistory(runNo: string) {
	return useQuery({
		queryKey: ["mes", "readiness", runNo, "history"],
		enabled: Boolean(runNo),
		queryFn: async () => {
			const response = await client.api.runs({ runNo }).readiness.history.get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function usePerformPrecheck() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (runNo: string) => {
			const response = await client.api.runs({ runNo }).readiness.precheck.post({});
			return unwrap(response);
		},
		onSuccess: (_data, runNo) => {
			toast.success("预检完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness", runNo] });
		},
		onError: () => {
			toast.error("预检失败");
		},
	});
}

export function usePerformFormalCheck() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (runNo: string) => {
			const response = await client.api.runs({ runNo }).readiness.check.post({});
			return unwrap(response);
		},
		onSuccess: (_data, runNo) => {
			toast.success("正式检查完成");
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness", runNo] });
			queryClient.invalidateQueries({ queryKey: ["mes", "run-detail", runNo] });
		},
		onError: () => {
			toast.error("正式检查失败");
		},
	});
}

export function useWaiveItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			runNo,
			itemId,
			reason,
		}: {
			runNo: string;
			itemId: string;
			reason: string;
		}) => {
			const response = await client.api
				.runs({ runNo })
				.readiness.items({ itemId })
				.waive.post({ reason });
			return unwrap(response);
		},
		onSuccess: (_data, variables) => {
			toast.success("检查项已豁免");
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness", variables.runNo] });
		},
		onError: () => {
			toast.error("豁免失败");
		},
	});
}

export type ExceptionsQuery = {
	lineId?: string;
	status?: "PREP" | "ALL";
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
};

type ExceptionsResponse = Awaited<ReturnType<typeof client.api.readiness.exceptions.get>>["data"];
export type ExceptionItem = NonNullable<ExceptionsResponse>["data"]["items"][number];

export function useReadinessExceptions(query: ExceptionsQuery) {
	return useQuery({
		queryKey: ["mes", "readiness", "exceptions", query],
		queryFn: async () => {
			const response = await client.api.readiness.exceptions.get({ query });
			return unwrap(response);
		},
		staleTime: 30_000,
	});
}
