import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

type FilterFieldType = "string" | "string[]" | "number" | "boolean" | "date";

interface FilterFieldConfig {
	type: FilterFieldType;
	defaultValue: unknown;
	urlKey?: string;
}

interface UseFilterStateOptions<T extends Record<string, unknown>> {
	fields: { [K in keyof T]: FilterFieldConfig };
	syncUrl?: boolean;
	urlReplace?: boolean;
}

interface FilterState<T> {
	filters: T;
	setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
	setFilters: (filters: Partial<T>) => void;
	resetFilters: () => void;
	isFiltered: boolean;
}

function parseUrlValue(value: unknown, type: FilterFieldType): unknown {
	if (value === undefined || value === null || value === "") {
		switch (type) {
			case "string":
			case "date":
				return "";
			case "string[]":
				return [];
			case "number":
				return 0;
			case "boolean":
				return false;
		}
	}

	switch (type) {
		case "string":
		case "date":
			return String(value);
		case "string[]":
			if (Array.isArray(value)) return value;
			return String(value)
				.split(",")
				.filter((v) => v.length > 0);
		case "number":
			return Number(value) || 0;
		case "boolean":
			return value === "true" || value === true;
	}
}

function serializeToUrl(value: unknown, type: FilterFieldType): string | undefined {
	if (value === undefined || value === null) return undefined;

	switch (type) {
		case "string":
		case "date":
			return value === "" ? undefined : String(value);
		case "string[]": {
			const arr = value as string[];
			return arr.length === 0 ? undefined : arr.join(",");
		}
		case "number":
			return value === 0 ? undefined : String(value);
		case "boolean":
			return value === false ? undefined : "true";
	}
}

function isDefaultValue(value: unknown, defaultValue: unknown, type: FilterFieldType): boolean {
	switch (type) {
		case "string":
		case "date":
		case "number":
		case "boolean":
			return value === defaultValue;
		case "string[]": {
			const arr = value as string[];
			const defaultArr = defaultValue as string[];
			if (arr.length !== defaultArr.length) return false;
			return arr.every((v, i) => v === defaultArr[i]);
		}
	}
}

export function useFilterState<T extends Record<string, unknown>>(
	options: UseFilterStateOptions<T>,
): FilterState<T> {
	const { fields, syncUrl = true, urlReplace = true } = options;
	const navigate = useNavigate();

	// Always call useSearch at top level (React hooks rule)
	// Use strict: false to avoid throwing when not in route context
	const searchParams = useSearch({ strict: false }) || {};

	// Memoize searchParams to avoid object reference issues
	const memoizedSearchParams = useMemo(
		() => JSON.stringify(searchParams),
		[searchParams],
	);

	// Parse current filters from URL or use defaults
	const filters = useMemo(() => {
		const parsedParams = JSON.parse(memoizedSearchParams) as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const [key, config] of Object.entries(fields)) {
			const urlKey = (config as FilterFieldConfig).urlKey || key;
			const urlValue = parsedParams[urlKey];
			result[key] = parseUrlValue(urlValue, (config as FilterFieldConfig).type);
		}
		return result as T;
	}, [fields, memoizedSearchParams]);

	// Check if any filter is different from default
	const isFiltered = useMemo(() => {
		for (const [key, config] of Object.entries(fields)) {
			const fieldConfig = config as FilterFieldConfig;
			if (!isDefaultValue(filters[key], fieldConfig.defaultValue, fieldConfig.type)) {
				return true;
			}
		}
		return false;
	}, [fields, filters]);

	// Update URL with new filters
	const updateUrl = useCallback(
		(newFilters: Partial<T>) => {
			if (!syncUrl) return;

			const parsedParams = JSON.parse(memoizedSearchParams) as Record<string, unknown>;
			const newSearch: Record<string, string | undefined> = { ...parsedParams } as Record<
				string,
				string | undefined
			>;

			// Build new search params
			for (const [key, config] of Object.entries(fields)) {
				const fieldConfig = config as FilterFieldConfig;
				const urlKey = fieldConfig.urlKey || key;
				const value = key in newFilters ? newFilters[key] : filters[key];
				newSearch[urlKey] = serializeToUrl(value, fieldConfig.type);
			}

			newSearch.page = "1"; // Reset page when filters change

			navigate({
				to: ".",
				search: newSearch,
				replace: urlReplace,
			});
		},
		[fields, filters, navigate, syncUrl, urlReplace, memoizedSearchParams],
	);

	const setFilter = useCallback(
		<K extends keyof T>(key: K, value: T[K]) => {
			updateUrl({ [key]: value } as unknown as Partial<T>);
		},
		[updateUrl],
	);

	const setFilters = useCallback(
		(newFilters: Partial<T>) => {
			updateUrl(newFilters);
		},
		[updateUrl],
	);

	const resetFilters = useCallback(() => {
		const defaults: Partial<T> = {};
		for (const [key, config] of Object.entries(fields)) {
			(defaults as Record<string, unknown>)[key] = (config as FilterFieldConfig).defaultValue;
		}
		updateUrl(defaults);
	}, [fields, updateUrl]);

	return {
		filters,
		setFilter,
		setFilters,
		resetFilters,
		isFiltered,
	};
}
