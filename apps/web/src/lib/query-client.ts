import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-error";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Cache and reuse list/detail data to reduce redundant fetches.
			staleTime: 30_000,
			gcTime: 5 * 60_000,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if (error instanceof ApiError) {
					if (error.status === 401 || error.status === 403) return false;
				}
				return failureCount < 2;
			},
		},
	},
});
