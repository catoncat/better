import { useQuery } from "@tanstack/react-query";
import { fetchClient } from "@/lib/api-client";

export type StationGroup = {
	id: string;
	code: string;
	name: string;
};

type StationGroupListResponse = {
	items: StationGroup[];
};

export function useStationGroups() {
	return useQuery({
		queryKey: ["mes", "station-groups"],
		queryFn: async () => fetchClient<StationGroupListResponse>("/stations/groups"),
		staleTime: 30_000,
	});
}
