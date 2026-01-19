import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
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

// Type for unit data specs
const unitDataSpecsApi = (stationCode: string, sn: string) =>
	client.api.stations({ stationCode }).unit({ sn })["data-specs"];
type UnitDataSpecsEnvelope = Awaited<
	ReturnType<ReturnType<typeof unitDataSpecsApi>["get"]>
>["data"];
export type UnitDataSpecs = UnwrapEnvelope<NonNullable<UnitDataSpecsEnvelope>>;
export type DataSpecItem = UnitDataSpecs["specs"][number];

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

export function useUnitDataSpecs(stationCode: string, sn: string) {
	return useQuery<UnitDataSpecs>({
		queryKey: ["mes", "unit-data-specs", stationCode, sn],
		enabled: Boolean(stationCode) && Boolean(sn),
		queryFn: async () => {
			const response = await client.api.stations({ stationCode }).unit({ sn })["data-specs"].get();
			return unwrap(response);
		},
	});
}

export function useTrackIn() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ stationCode, ...body }: TrackInInput & { stationCode: string }) => {
			const response = await client.api.stations({ stationCode })["track-in"].post(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("进站成功");
			queryClient.invalidateQueries({ queryKey: ["mes"] });
		},
		onError: (error: unknown) => {
			showError("进站失败", error);
		},
	});
}

export function useTrackOut() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ stationCode, ...body }: TrackOutInput & { stationCode: string }) => {
			const response = await client.api.stations({ stationCode })["track-out"].post(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("出站成功");
			queryClient.invalidateQueries({ queryKey: ["mes"] });
		},
		onError: (error: unknown) => {
			showError("出站失败", error);
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
