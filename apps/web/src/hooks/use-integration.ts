import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;

const integrationStatusApi = client.api.integration.status;
type IntegrationStatusResponse = Awaited<ReturnType<typeof integrationStatusApi.get>>["data"];
type IntegrationStatusData = UnwrapEnvelope<NonNullable<IntegrationStatusResponse>>;
export type IntegrationJobStatus = IntegrationStatusData["jobs"][number];
export type IntegrationCursorStatus = NonNullable<IntegrationJobStatus["cursor"]>;
export type IntegrationCronStatus = NonNullable<IntegrationJobStatus["lastCron"]>;

const erpRouteSyncApi = client.api.integration.erp.routes.sync;
const erpWorkOrderSyncApi = client.api.integration.erp["work-orders"].sync;
const erpMaterialSyncApi = client.api.integration.erp.materials.sync;
const erpBomSyncApi = client.api.integration.erp.boms.sync;
const erpWorkCenterSyncApi = client.api.integration.erp["work-centers"].sync;
const tpmEquipmentSyncApi = client.api.integration.tpm.equipment.sync;
const tpmStatusLogSyncApi = client.api.integration.tpm["status-logs"].sync;
const tpmMaintenanceTaskSyncApi = client.api.integration.tpm["maintenance-tasks"].sync;

type SyncApiMap = {
	"ERP:ROUTING": typeof erpRouteSyncApi;
	"ERP:WORK_ORDER": typeof erpWorkOrderSyncApi;
	"ERP:MATERIAL": typeof erpMaterialSyncApi;
	"ERP:BOM": typeof erpBomSyncApi;
	"ERP:WORK_CENTER": typeof erpWorkCenterSyncApi;
	"TPM:EQUIPMENT": typeof tpmEquipmentSyncApi;
	"TPM:STATUS_LOG": typeof tpmStatusLogSyncApi;
	"TPM:MAINTENANCE_TASK": typeof tpmMaintenanceTaskSyncApi;
};

const syncApiMap: SyncApiMap = {
	"ERP:ROUTING": erpRouteSyncApi,
	"ERP:WORK_ORDER": erpWorkOrderSyncApi,
	"ERP:MATERIAL": erpMaterialSyncApi,
	"ERP:BOM": erpBomSyncApi,
	"ERP:WORK_CENTER": erpWorkCenterSyncApi,
	"TPM:EQUIPMENT": tpmEquipmentSyncApi,
	"TPM:STATUS_LOG": tpmStatusLogSyncApi,
	"TPM:MAINTENANCE_TASK": tpmMaintenanceTaskSyncApi,
};

export function useIntegrationStatus() {
	return useQuery({
		queryKey: ["mes", "integration-status"],
		queryFn: async () => {
			const response = await integrationStatusApi.get();
			const data = unwrap(response);
			return data.jobs;
		},
		staleTime: 15_000,
	});
}

export function useTriggerIntegrationSync() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			sourceSystem,
			entityType,
		}: {
			sourceSystem: string;
			entityType: string;
		}) => {
			const key = `${sourceSystem}:${entityType}` as keyof SyncApiMap;
			const api = syncApiMap[key];
			if (!api) {
				throw new Error("未找到对应的同步任务");
			}
			const response = await api.post();
			return unwrap(response);
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
