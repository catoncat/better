import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

type TrackInInput = Parameters<ReturnType<typeof client.api.stations>["track-in"]["post"]>[0];
type TrackOutInput = Parameters<ReturnType<typeof client.api.stations>["track-out"]["post"]>[0];
type ApiStationResponse = Awaited<ReturnType<typeof client.api.stations.get>>["data"];
export type StationList = Exclude<
	ApiStationResponse,
	{ code: string; message: string } | null | undefined
>;
export type Station = StationList["items"][number];

export function useStations() {
	return useQuery<StationList>({
		queryKey: ["mes", "stations"],
		queryFn: async () => {
			const { data, error } = await client.api.stations.get();
			if (error) throw new Error("获取工位失败");
			if (!data) throw new Error("未返回工位数据");
			return data;
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
