import { useCallback, useEffect, useMemo, useState } from "react";
import { getRouteCacheKey } from "./route-context";

export type SuggestionItem = {
	question: string;
	action: "fill" | "send";
};

type UseSuggestionsOptions = {
	currentPath: string;
	reply?: string | null;
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

type SuggestionCacheEntry = {
	signature: string;
	suggestions: SuggestionItem[];
};

// Cache suggestions per route to avoid repeated API calls
const suggestionsCache = new Map<string, SuggestionCacheEntry>();

function getReplySignature(reply?: string | null): string {
	if (!reply) return "";
	const trimmed = reply.trim();
	return `${trimmed.length}:${trimmed.slice(0, 64)}:${trimmed.slice(-64)}`;
}

/**
 * Custom hook for fetching suggested questions based on current page
 */
export function useSuggestions(options: UseSuggestionsOptions): UseSuggestionsReturn {
	const { currentPath, reply, enabled = true } = options;
	const cacheKey = useMemo(() => getRouteCacheKey(currentPath), [currentPath]);
	const replySignature = useMemo(() => getReplySignature(reply), [reply]);
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchSuggestions = useCallback(
		async (force = false) => {
			if (!enabled) return;

			// Check cache first (unless force refresh)
			if (!force) {
				const cached = suggestionsCache.get(cacheKey);
				if (cached && cached.signature === replySignature) {
					setSuggestions(cached.suggestions);
					return;
				}
			}

			setIsLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams({ path: cacheKey });
				if (reply) {
					params.set("reply", reply);
				}
				const response = await fetch(
					`${BASE_URL}/chat/suggestions?${params.toString()}`,
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
					suggestionsCache.set(cacheKey, {
						signature: replySignature,
						suggestions: fetchedSuggestions,
					});
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
		[cacheKey, enabled, reply, replySignature],
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
