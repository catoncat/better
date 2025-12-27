import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const traceApi = client.api.trace.units;
type TraceResponse = Awaited<ReturnType<ReturnType<typeof traceApi>["get"]>>["data"];
type TraceData = NonNullable<TraceResponse>;
type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
export type UnitTrace = UnwrapEnvelope<TraceData>;

export function useUnitTrace(sn: string, mode: "run" | "latest" = "run") {
	return useQuery({
		queryKey: ["mes", "trace", sn, mode],
		enabled: Boolean(sn),
		queryFn: async () => {
			const response = await client.api.trace.units({ sn }).get({ query: { mode } });
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}
