import { useCallback, useEffect, useMemo, useState } from "react";
import { getRouteCacheKey } from "./route-context";

export type SuggestionItem = {
	question: string;
	action: "fill" | "send";
};

type UseSuggestionsOptions = {
	currentPath: string;
	enabled?: boolean;
};

type UseSuggestionsReturn = {
	suggestions: SuggestionItem[];
	isLoading: boolean;
	error: string | null;
	refresh: () => void;
};

const BASE_URL = import.meta.env.VITE_SERVER_URL
	? `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, "")}/api`
	: "/api";

// Cache suggestions per path to avoid repeated API calls
const suggestionsCache = new Map<string, SuggestionItem[]>();

/**
 * Custom hook for fetching suggested questions based on current page
 */
export function useSuggestions(options: UseSuggestionsOptions): UseSuggestionsReturn {
	const { currentPath, enabled = true } = options;
	const cacheKey = useMemo(() => getRouteCacheKey(currentPath), [currentPath]);
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchSuggestions = useCallback(
		async (force = false) => {
			if (!enabled) return;

			// Check cache first (unless force refresh)
			if (!force && suggestionsCache.has(cacheKey)) {
				setSuggestions(suggestionsCache.get(cacheKey) || []);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`${BASE_URL}/chat/suggestions?path=${encodeURIComponent(cacheKey)}`,
					{
						method: "GET",
						credentials: "include",
					},
				);

				if (!response.ok) {
					throw new Error(`请求失败: ${response.status}`);
				}

				const data = await response.json();

				if (data.ok && Array.isArray(data.suggestions)) {
					const fetchedSuggestions = data.suggestions as SuggestionItem[];
					setSuggestions(fetchedSuggestions);
					// Cache the result
					suggestionsCache.set(cacheKey, fetchedSuggestions);
				} else {
					setSuggestions([]);
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "获取建议问题失败";
				setError(errorMessage);
				setSuggestions([]);
			} finally {
				setIsLoading(false);
			}
		},
		[cacheKey, enabled],
	);

	// Fetch suggestions when path changes
	useEffect(() => {
		fetchSuggestions();
	}, [fetchSuggestions]);

	const refresh = useCallback(() => {
		fetchSuggestions(true);
	}, [fetchSuggestions]);

	return {
		suggestions,
		isLoading,
		error,
		refresh,
	};
}
