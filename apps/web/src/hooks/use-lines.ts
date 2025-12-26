import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

export function useLines() {
	return useQuery({
		queryKey: ["mes", "lines"],
		queryFn: async () => {
			const response = await client.api.lines.get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000,
	});
}
