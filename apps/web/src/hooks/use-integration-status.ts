import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

// Infer types from API response
export type IntegrationStatusResponse = Awaited<
	ReturnType<(typeof client.api.integration.status)["get"]>
>["data"];
export type IntegrationStatusData = NonNullable<IntegrationStatusResponse>["data"];
export type IntegrationJobStatus = IntegrationStatusData["jobs"][number];

/**
 * Get integration sync status for all jobs
 */
export function useIntegrationStatus() {
	return useQuery<IntegrationStatusData>({
		queryKey: ["mes", "integration", "status"],
		queryFn: async () => {
			const response = await client.api.integration.status.get();
			return unwrap(response);
		},
		staleTime: 30_000, // 30 seconds
		refetchInterval: 60_000, // Auto-refresh every minute
	});
}
