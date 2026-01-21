import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

export type EquipmentInspectionRecordListResponse = Awaited<
	ReturnType<(typeof client.api)["equipment-inspection-records"]["get"]>
>["data"];
export type EquipmentInspectionRecordListData =
	NonNullable<EquipmentInspectionRecordListResponse>["data"];
export type EquipmentInspectionRecord = EquipmentInspectionRecordListData["items"][number];

export type EquipmentInspectionRecordQuery = {
	lineCode?: string;
	equipmentType?: string;
	result?: string;
	machineName?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
};

type EquipmentInspectionCreateInput = Parameters<
	(typeof client.api)["equipment-inspection-records"]["post"]
>[0];

export function useEquipmentInspectionRecordList(query: EquipmentInspectionRecordQuery) {
	return useQuery<EquipmentInspectionRecordListData>({
		queryKey: ["mes", "equipment-inspection-records", query],
		queryFn: async () => {
			const response = await client.api["equipment-inspection-records"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: EquipmentInspectionRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}

export function useCreateEquipmentInspectionRecord() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (data: EquipmentInspectionCreateInput) => {
			const response = await client.api["equipment-inspection-records"].post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("设备点检记录已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "equipment-inspection-records"] });
		},
		onError: (error: unknown) => showError("创建设备点检记录失败", error),
	});
}
