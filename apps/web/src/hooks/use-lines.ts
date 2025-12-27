import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type LineListResponse = Awaited<ReturnType<typeof client.api.lines.get>>["data"];
type LineListData = UnwrapEnvelope<NonNullable<LineListResponse>>;

export function useLines() {
	return useQuery<LineListData>({
		queryKey: ["mes", "lines"],
		queryFn: async () => {
			const response = await client.api.lines.get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000,
	});
}
