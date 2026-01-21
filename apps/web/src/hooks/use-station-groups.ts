import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const stationGroupsApi = client.api.stations.groups;
type StationGroupListResponse = Awaited<ReturnType<typeof stationGroupsApi.get>>["data"];
type StationGroupListData = NonNullable<StationGroupListResponse>;
export type StationGroup = StationGroupListData["items"][number];

export function useStationGroups(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["mes", "station-groups"],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await stationGroupsApi.get();
			return unwrap(response);
		},
		staleTime: 30_000,
	});
}
