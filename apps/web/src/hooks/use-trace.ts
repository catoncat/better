import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const traceApi = client.api.trace.units;
type TraceResponse = Awaited<ReturnType<ReturnType<typeof traceApi>["get"]>>["data"];
type TraceData = NonNullable<TraceResponse>;
type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
export type UnitTrace = UnwrapEnvelope<TraceData>;

const traceMaterialLotApi = client.api.trace["material-lots"];
type MaterialLotUnitsResponse = Awaited<
	ReturnType<ReturnType<typeof traceMaterialLotApi>["units"]["get"]>
>["data"];
type MaterialLotUnitsData = NonNullable<MaterialLotUnitsResponse>;
export type MaterialLotTraceUnits = UnwrapEnvelope<MaterialLotUnitsData>;

export function useUnitTrace(
	sn: string,
	mode: "run" | "latest" = "run",
	options?: { enabled?: boolean },
) {
	return useQuery({
		queryKey: ["mes", "trace", sn, mode],
		enabled: Boolean(sn) && (options?.enabled ?? true),
		queryFn: async () => {
			const response = await client.api.trace.units({ sn }).get({ query: { mode } });
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}

export function useMaterialLotTraceUnits(
	materialCode: string,
	lotNo: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		queryKey: ["mes", "trace", "material-lot", materialCode, lotNo],
		enabled: Boolean(materialCode && lotNo) && (options?.enabled ?? true),
		queryFn: async () => {
			const response = await client.api.trace["material-lots"]({ materialCode, lotNo }).units.get();
			return unwrap(response);
		},
		staleTime: 10_000,
	});
}
