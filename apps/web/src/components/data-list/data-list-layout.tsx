import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterToolbar } from "@/components/data-list/filter-toolbar";
import { QueryPresetBar } from "@/components/data-list/query-preset-bar";
import { DataListView, type DataListViewProps } from "@/components/data-table/data-list-view";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type QueryPresetBarPropsAny = ComponentProps<typeof QueryPresetBar<unknown>>;
type FilterToolbarPropsAny = ComponentProps<typeof FilterToolbar>;

type DataListMode = "client" | "server";

interface BasePaginationConfig {
	pageParam?: string;
	pageSizeParam?: string;
	defaultPageSize?: number;
	syncWithUrl?: boolean;
}

interface BaseSortingConfig {
	sortParam?: string;
	/** Whether to sync sorting state with URL. Default: true */
	syncWithUrl?: boolean;
}

interface DataListLayoutProps<TData, TValue> {
	mode?: DataListMode;
	columns: ColumnDef<TData, TValue>[];
	header?: ReactNode;
	queryPresetBarProps?: QueryPresetBarPropsAny;
	filterToolbarProps?: FilterToolbarPropsAny;
	dataListViewProps?: Omit<DataListViewProps<TData, TValue>, "table" | "columns">;
	isLoading?: boolean;
	isFetching?: boolean;
	loadingFallback?: ReactNode;
	error?: ReactNode;
	beforeList?: ReactNode;
	afterList?: ReactNode;
	pagination?: boolean | ReactNode;
	paginationConfig?: BasePaginationConfig;
	sortingConfig?: BaseSortingConfig;
	viewPreferencesKey?: string;
	className?: string;
	children?: ReactNode;
	/**
	 * Client mode: pass full data, internal pagination
	 * Server mode: pass pageCount + onPaginationChange; data is current page
	 */
	data?: TData[];
	pageCount?: number;
	onPaginationChange?: (pagination: PaginationState) => void;
	/** Optional callback for server-side sorting */
	onSortingChange?: (sorting: SortingState) => void;
	/** Initial sorting state (used when URL has no sort param) */
	initialSorting?: SortingState;
	initialPageIndex?: number;
	initialPageSize?: number;
	/** Advanced escape hatch: use custom table; URL sync will be skipped */
	table?: ReturnType<typeof useReactTable<TData>>;
	/** Optional meta passed to internal table (e.g., action handlers) */
	tableMeta?: ReturnType<typeof useReactTable<TData>>["options"]["meta"];
	/** Optional current location.search to detect router-driven changes */
	locationSearch?: string;
}

export function DataListLayout<TData, TValue>({
	table,
	data,
	columns,
	header,
	queryPresetBarProps,
	filterToolbarProps,
	dataListViewProps,
	isLoading,
	isFetching,
	loadingFallback,
	error,
	beforeList,
	afterList,
	pagination = true,
	paginationConfig,
	sortingConfig,
	viewPreferencesKey,
	className,
	children,
	mode = "client",
	pageCount,
	onPaginationChange,
	onSortingChange,
	initialSorting,
	initialPageIndex,
	initialPageSize,
	tableMeta,
	locationSearch,
}: DataListLayoutProps<TData, TValue>) {
	const pageParam = paginationConfig?.pageParam ?? "page";
	const pageSizeParam = paginationConfig?.pageSizeParam ?? "pageSize";
	const defaultPageSize = paginationConfig?.defaultPageSize ?? 30;
	const syncWithUrl = paginationConfig?.syncWithUrl ?? true;
	const sortParam = sortingConfig?.sortParam ?? "sort";
	const syncSortingWithUrl = sortingConfig?.syncWithUrl ?? true;

	const effectiveViewPreferencesKey =
		viewPreferencesKey ??
		filterToolbarProps?.viewPreferencesKey ??
		dataListViewProps?.viewPreferencesKey;

	if (
		!effectiveViewPreferencesKey &&
		(filterToolbarProps || dataListViewProps) &&
		typeof window !== "undefined"
	) {
		console.warn(
			"DataListLayout: viewPreferencesKey is required to avoid cross-page preference leakage.",
		);
	}

	const parsePagination = useCallback(
		(searchOverride?: string): PaginationState => {
			const searchString =
				searchOverride ??
				(typeof window !== "undefined" ? window.location.search : undefined) ??
				"";
			if (typeof window === "undefined" && !searchOverride) {
				return {
					pageIndex: initialPageIndex ?? 0,
					pageSize: initialPageSize ?? defaultPageSize,
				};
			}
			const params = new URLSearchParams(searchString);
			const page = Number(params.get(pageParam));
			const size = Number(params.get(pageSizeParam));
			const pageIndex = Number.isFinite(page) && page > 0 ? page - 1 : (initialPageIndex ?? 0);
			const pageSize =
				Number.isFinite(size) && size > 0 ? size : (initialPageSize ?? defaultPageSize);
			return {
				pageIndex,
				pageSize,
			};
		},
		[pageParam, pageSizeParam, defaultPageSize, initialPageIndex, initialPageSize],
	);

	const [paginationState, setPaginationState] = useState<PaginationState>(parsePagination);

	const parseSorting = useCallback(
		(searchOverride?: string): SortingState => {
			const searchString =
				searchOverride ??
				(typeof window !== "undefined" ? window.location.search : undefined) ??
				"";
			if (typeof window === "undefined" && !searchOverride) {
				return initialSorting ?? [];
			}
			const params = new URLSearchParams(searchString);
			const raw = params.get(sortParam);
			if (!raw) return initialSorting ?? [];

			return raw
				.split(",")
				.map((part) => {
					const trimmed = part.trim();
					if (!trimmed) return null;
					const lastDot = trimmed.lastIndexOf(".");
					if (lastDot <= 0) return null;
					const id = trimmed.slice(0, lastDot);
					const dir = trimmed.slice(lastDot + 1);
					if (!id) return null;
					return { id, desc: dir === "desc" };
				})
				.filter(Boolean) as SortingState;
		},
		[sortParam, initialSorting],
	);

	const [sortingState, setSortingState] = useState<SortingState>(parseSorting);

	// URL -> state (back/forward or external changes)
	useEffect(() => {
		if (!syncWithUrl || typeof window === "undefined" || pagination === false) return;
		const handlePopState = () => {
			setPaginationState(parsePagination());
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [parsePagination, syncWithUrl, pagination]);

	// React to router/search changes (filter changes should reset to page 1)
	useEffect(() => {
		if (!syncWithUrl || pagination === false) return;
		setPaginationState(parsePagination(locationSearch));
	}, [parsePagination, syncWithUrl, pagination, locationSearch]);

	// state -> URL
	useEffect(() => {
		if (
			!syncWithUrl ||
			typeof window === "undefined" ||
			pagination === false ||
			(mode === "server" && onPaginationChange)
		)
			return;
		const params = new URLSearchParams(window.location.search);
		params.set(pageParam, String(paginationState.pageIndex + 1));
		params.set(pageSizeParam, String(paginationState.pageSize));
		const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
		window.history.replaceState({}, "", newUrl);
	}, [
		paginationState,
		pageParam,
		pageSizeParam,
		syncWithUrl,
		pagination,
		mode,
		onPaginationChange,
	]);

	// URL -> sorting state (back/forward)
	useEffect(() => {
		if (!syncSortingWithUrl || typeof window === "undefined" || table) return;
		const handlePopState = () => {
			setSortingState(parseSorting());
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [parseSorting, syncSortingWithUrl, table]);

	// React to router/search changes
	useEffect(() => {
		if (!syncSortingWithUrl || table) return;
		setSortingState(parseSorting(locationSearch));
	}, [parseSorting, syncSortingWithUrl, locationSearch, table]);

	// sorting state -> URL
	useEffect(() => {
		if (
			!syncSortingWithUrl ||
			typeof window === "undefined" ||
			table ||
			(mode === "server" && onSortingChange)
		)
			return;
		const params = new URLSearchParams(window.location.search);
		if (sortingState.length === 0) {
			params.delete(sortParam);
		} else {
			const serialized = sortingState.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(",");
			params.set(sortParam, serialized);
		}
		const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
		window.history.replaceState({}, "", newUrl);
	}, [sortingState, sortParam, syncSortingWithUrl, table, mode, onSortingChange]);

	// Build table internally for both modes unless a custom table is explicitly provided.
	const manualSorting = mode === "server" && !!onSortingChange;
	const useClientPagination = mode !== "server";
	const resolvedPageCount = useClientPagination
		? Math.max(1, Math.ceil((data?.length ?? 0) / paginationState.pageSize))
		: Math.max(1, pageCount ?? 1);

	if (mode === "server" && !pageCount && typeof window !== "undefined") {
		console.warn(
			"DataListLayout: pageCount is required in server mode; falling back to 1 may break pagination.",
		);
	}

	const internalTable = useReactTable<TData>({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: useClientPagination ? getPaginationRowModel() : undefined,
		getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
		state: { pagination: paginationState, sorting: sortingState },
		onPaginationChange: (updater) => {
			setPaginationState((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				// In server mode, notify parent so it can refetch.
				if (mode === "server" && onPaginationChange) {
					onPaginationChange(next);
				}
				return next;
			});
		},
		onSortingChange: (updater) => {
			setSortingState((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				onSortingChange?.(next);
				return next;
			});
			// Reset to first page on sorting change.
			setPaginationState((prev) => {
				const next = { ...prev, pageIndex: 0 };
				// In server + manual sorting mode, parent sorting handler is responsible
				// for URL/page reset; avoid double-calling pagination change.
				if (mode === "server" && onPaginationChange && !manualSorting) {
					onPaginationChange(next);
				}
				return next;
			});
		},
		manualPagination: !useClientPagination,
		manualSorting,
		pageCount: resolvedPageCount,
		autoResetPageIndex: useClientPagination,
		meta: tableMeta,
	});

	const effectiveTable = useMemo(() => {
		return (table as typeof internalTable | undefined) ?? internalTable;
	}, [table, internalTable]);

	const renderPagination =
		pagination === false ? null : pagination === true ? (
			effectiveTable ? (
				<DataTablePagination table={effectiveTable} />
			) : null
		) : (
			pagination
		);

	const mergedFilterToolbarProps = filterToolbarProps
		? {
				...filterToolbarProps,
				viewPreferencesKey: filterToolbarProps.viewPreferencesKey ?? viewPreferencesKey,
			}
		: undefined;

	const mergedDataListViewProps = {
		viewPreferencesKey: dataListViewProps?.viewPreferencesKey ?? viewPreferencesKey,
		...dataListViewProps,
	};

	const hasRows = effectiveTable?.getRowModel().rows.length > 0;
	const showLoadingOverlay = hasRows && (isFetching || isLoading);

	return (
		<div className={cn("flex flex-col gap-4 w-full min-w-0", className)}>
			{header}
			{queryPresetBarProps && <QueryPresetBar {...queryPresetBarProps} />}
			{mergedFilterToolbarProps && (
				<FilterToolbar
					{...mergedFilterToolbarProps}
					table={mergedFilterToolbarProps.table ?? effectiveTable}
				/>
			)}
			{beforeList}
			{error ? (
				error
			) : effectiveTable ? (
				<div className="relative w-full min-w-0">
					<DataListView table={effectiveTable} columns={columns} {...mergedDataListViewProps} />
					{showLoadingOverlay && (
						<div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] pointer-events-none">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/70 to-primary/40 animate-pulse" />
						</div>
					)}
				</div>
			) : null}
			{isLoading &&
				!hasRows &&
				(loadingFallback ?? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
			{renderPagination}
			{afterList}
			{children}
		</div>
	);
}
