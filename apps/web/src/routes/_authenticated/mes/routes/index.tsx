import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { type RouteSummary, useRouteList } from "@/hooks/use-routes";
import { RouteCard } from "../-components/route-card";
import { routeColumns } from "../-components/route-columns";

interface RouteFilters {
	search: string;
	sourceSystem: string;
}

interface RouteSearchParams {
	search?: string;
	sourceSystem?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/routes/")({
	validateSearch: (search: Record<string, unknown>): RouteSearchParams => ({
		search: (search.search as string) || undefined,
		sourceSystem: (search.sourceSystem as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: RouteListPage,
});

function RouteListPage() {
	const viewPreferencesKey = "routes";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/routes/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	// Parse filters from URL
	const filters: RouteFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			sourceSystem: searchParams.sourceSystem || "all",
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || filters.sourceSystem !== "all";
	}, [filters]);

	// Update URL with new filters
	const setFilter = useCallback(
		(key: string, value: unknown) => {
			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: value === "all" ? undefined : value,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(newFilters: Partial<RouteFilters>) => {
			const newSearch: RouteSearchParams = { ...searchParams, page: 1 };
			for (const [key, value] of Object.entries(newFilters)) {
				if (Array.isArray(value)) {
					(newSearch as Record<string, unknown>)[key] =
						value.length > 0 ? value.join(",") : undefined;
				} else {
					(newSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: newSearch,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: { page: 1, pageSize: searchParams.pageSize },
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	// Pagination state (driven by URL via DataListLayout server mode)
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

	// Sync pagination state from URL (sorting/filtering resets page)
	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 30);
	}, [searchParams.page, searchParams.pageSize]);

	// Query presets
	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<RouteFilters>({ storageKey: "routes" });

	// System presets
	const systemPresets = useMemo((): SystemPreset<RouteFilters>[] => {
		return [
			{ id: "erp", name: "ERP来源", filters: { sourceSystem: "ERP", search: "" } },
			{ id: "mes", name: "MES来源", filters: { sourceSystem: "MES", search: "" } },
		];
	}, []);

	// All presets for matching
	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);

	// Find active preset based on current filters
	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	// Handle preset apply
	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<RouteFilters>) => {
			const newFilters: Partial<RouteFilters> = {
				search: "",
				sourceSystem: "all",
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error } = useRouteList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		sourceSystem: filters.sourceSystem === "all" ? undefined : filters.sourceSystem,
	});

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: { ...searchParams, page: next.pageIndex + 1, pageSize: next.pageSize },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={routeColumns}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
			locationSearch={locationSearch}
			isLoading={isLoading}
			error={
				error ? (
					<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
						加载失败：{error instanceof Error ? error.message : "未知错误"}
					</div>
				) : null
			}
			header={
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold tracking-tight">路由管理</h1>
					<p className="text-muted-foreground">查看工艺路线、来源与步骤信息。</p>
				</div>
			}
			queryPresetBarProps={{
				systemPresets,
				userPresets,
				matchedPresetId: currentActivePresetId,
				onApplyPreset: handleApplyPreset,
				onSavePreset: (name) => savePreset(name, filters),
				onDeletePreset: deletePreset,
				onRenamePreset: renamePreset,
			}}
			filterToolbarProps={{
				fields: [
					{
						key: "search",
						type: "search",
						placeholder: "搜索路由编码、名称或产品编码...",
					},
					{
						key: "sourceSystem",
						type: "select",
						label: "来源",
						options: [
							{ label: "全部", value: "all" },
							{ label: "ERP", value: "ERP" },
							{ label: "MES", value: "MES" },
						],
					},
				],
				filters,
				onFilterChange: setFilter,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item: RouteSummary) => <RouteCard route={item} />,
			}}
		/>
	);
}
