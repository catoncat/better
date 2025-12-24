import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

/**
 * Get unique departments from all instruments
 * Uses a dedicated backend endpoint for efficiency
 */
export function useInstrumentDepartments() {
	return useQuery({
		queryKey: ["instrument-departments"],
		queryFn: async () => {
			const response = await client.api.instruments.departments.get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});
}
