import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/eden";

/**
 * Get unique departments from all instruments
 * Uses a dedicated backend endpoint for efficiency
 */
export function useInstrumentDepartments() {
	return useQuery({
		queryKey: ["instrument-departments"],
		queryFn: async () => {
			const { data, error } = await client.api.instruments.departments.get();

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			if (!data) {
				throw new Error("No data received");
			}

			return data;
		},
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});
}
