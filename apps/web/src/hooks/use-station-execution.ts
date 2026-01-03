import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type TrackInInput = Parameters<ReturnType<typeof client.api.stations>["track-in"]["post"]>[0];
type TrackOutInput = Parameters<ReturnType<typeof client.api.stations>["track-out"]["post"]>[0];
type StationListResponse = Awaited<ReturnType<typeof client.api.stations.get>>["data"];
export type StationList = NonNullable<StationListResponse>;
export type Station = StationList["items"][number];

const resolveUnitApi = client.api.stations["resolve-unit"];
type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type ResolveUnitEnvelope = Awaited<ReturnType<ReturnType<typeof resolveUnitApi>["get"]>>["data"];
export type ResolvedUnit = UnwrapEnvelope<NonNullable<ResolveUnitEnvelope>>;

const stationQueueApi = (code: string) => client.api.stations({ stationCode: code }).queue;
type StationQueueResponse = Awaited<ReturnType<ReturnType<typeof stationQueueApi>["get"]>>["data"];
export type StationQueue = NonNullable<StationQueueResponse>;
export type QueueItem = StationQueue["queue"][number];

export function useStations() {
	return useQuery<StationList>({
		queryKey: ["mes", "stations"],
		queryFn: async () => {
			const response = await client.api.stations.get();
			return unwrap(response);
		},
	});
}

export function useStationQueue(stationCode: string) {
	return useQuery<StationQueue>({
		queryKey: ["mes", "station-queue", stationCode],
		enabled: Boolean(stationCode),
		refetchInterval: 10_000,
		queryFn: async () => {
			const response = await client.api.stations({ stationCode }).queue.get();
			return unwrap(response);
		},
	});
}

export function useTrackIn() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ stationCode, ...body }: TrackInInput & { stationCode: string }) => {
			const { data, error } = await client.api.stations({ stationCode })["track-in"].post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "进站失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("进站成功");
			queryClient.invalidateQueries({ queryKey: ["mes"] });
		},
	});
}

export function useTrackOut() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ stationCode, ...body }: TrackOutInput & { stationCode: string }) => {
			const { data, error } = await client.api.stations({ stationCode })["track-out"].post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "出站失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("出站成功");
			queryClient.invalidateQueries({ queryKey: ["mes"] });
		},
	});
}

export function useResolveUnitBySn() {
	return useMutation({
		mutationFn: async ({ sn }: { sn: string }) => {
			const response = await client.api.stations["resolve-unit"]({ sn }).get();
			return unwrap(response);
		},
	});
}
