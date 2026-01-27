import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

export type DeviceDataRecordListResponse = Awaited<
	ReturnType<(typeof client.api.integration)["device-data"]["get"]>
>["data"];
export type DeviceDataRecordListData = NonNullable<DeviceDataRecordListResponse>["data"];
export type DeviceDataRecord = DeviceDataRecordListData["items"][number];

export type DeviceDataRecordQuery = {
	eventId?: string;
	runNo?: string;
	unitSn?: string;
	stationCode?: string;
	stepNo?: number;
	source?: "AUTO" | "MANUAL";
	eventFrom?: string;
	eventTo?: string;
	page?: number;
	pageSize?: number;
};

export function useDeviceDataRecordList(
	query: DeviceDataRecordQuery,
	options?: { enabled?: boolean },
) {
	return useQuery<DeviceDataRecordListData>({
		queryKey: ["mes", "integration", "device-data", query],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await client.api.integration["device-data"].get({ query });
			return unwrap(response);
		},
		placeholderData: (previousData: DeviceDataRecordListData | undefined) => previousData,
		staleTime: 10_000,
	});
}
