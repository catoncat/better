import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type DepartmentResponse = Awaited<
	ReturnType<typeof client.api.instruments.departments.get>
>["data"];
type DepartmentData = UnwrapEnvelope<NonNullable<DepartmentResponse>>;

/**
 * Get unique departments from all instruments
 * Uses a dedicated backend endpoint for efficiency
 */
export function useInstrumentDepartments() {
	return useQuery<DepartmentData>({
		queryKey: ["instrument-departments"],
		queryFn: async () => {
			const response = await client.api.instruments.departments.get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});
}
