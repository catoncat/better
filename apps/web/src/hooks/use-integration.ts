import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchClient } from "@/lib/api-client";

export type IntegrationCursorStatus = {
	sourceSystem: string;
	entityType: string;
	lastSyncAt: string | null;
	lastSeq: string | null;
	meta: unknown | null;
	updatedAt: string;
};

export type IntegrationCronStatus = {
	action: string;
	status: string;
	createdAt: string;
	details: unknown | null;
};

export type IntegrationJobStatus = {
	sourceSystem: string;
	entityType: string;
	cursor: IntegrationCursorStatus | null;
	lastCron: IntegrationCronStatus | null;
};

type IntegrationStatusResponse = {
	ok: boolean;
	data: {
		jobs: IntegrationJobStatus[];
	};
	error?: { code?: string; message?: string };
};

type IntegrationSyncResponse = {
	ok: boolean;
	data: {
		sourceSystem: string;
		entityType: string;
		cursor: { nextSyncAt?: string; hasMore: boolean };
		items: unknown[];
	};
	error?: { code?: string; message?: string };
};

const syncEndpointMap: Record<string, string> = {
	"ERP:ROUTING": "/integration/erp/routes/sync",
	"ERP:WORK_ORDER": "/integration/erp/work-orders/sync",
	"ERP:MATERIAL": "/integration/erp/materials/sync",
	"ERP:BOM": "/integration/erp/boms/sync",
	"ERP:WORK_CENTER": "/integration/erp/work-centers/sync",
	"TPM:EQUIPMENT": "/integration/tpm/equipment/sync",
	"TPM:STATUS_LOG": "/integration/tpm/status-logs/sync",
	"TPM:MAINTENANCE_TASK": "/integration/tpm/maintenance-tasks/sync",
};

export function useIntegrationStatus() {
	return useQuery({
		queryKey: ["mes", "integration-status"],
		queryFn: async () => {
			const response = await fetchClient<IntegrationStatusResponse>("/integration/status");
			if (!response.ok) {
				throw new Error(response.error?.message || "获取同步状态失败");
			}
			return response.data.jobs;
		},
		staleTime: 15_000,
	});
}

export function useTriggerIntegrationSync() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ sourceSystem, entityType }: { sourceSystem: string; entityType: string }) => {
			const key = `${sourceSystem}:${entityType}`;
			const endpoint = syncEndpointMap[key];
			if (!endpoint) {
				throw new Error("未找到对应的同步任务");
			}
			const response = await fetchClient<IntegrationSyncResponse>(endpoint, { method: "POST" });
			if (!response.ok) {
				throw new Error(response.error?.message || "同步触发失败");
			}
			return response.data;
		},
		onSuccess: () => {
			toast.success("同步已触发");
			queryClient.invalidateQueries({ queryKey: ["mes", "integration-status"] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
