import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type MaterialListItem, useMaterialList } from "@/hooks/use-materials";
import { useQueryPresets } from "@/hooks/use-query-presets";

interface MaterialFilters {
	search: string;
	category: string;
	unit: string;
	model: string;
	synced: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
}

interface MaterialSearchParams {
	search?: string;
	category?: string;
	unit?: string;
	model?: string;
	synced?: string;
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/materials/")({
	validateSearch: (search: Record<string, unknown>): MaterialSearchParams => ({
		search: (search.search as string) || undefined,
		category: (search.category as string) || undefined,
		unit: (search.unit as string) || undefined,
		model: (search.model as string) || undefined,
		synced: (search.synced as string) || undefined,
		updatedFrom: (search.updatedFrom as string) || undefined,
		updatedTo: (search.updatedTo as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: MaterialsPage,
});

const formatTime = (value?: string | Date | null) => {
	if (!value) return "-";
	return format(value instanceof Date ? value : new Date(value), "yyyy-MM-dd HH:mm");
};

function MaterialsPage() {
	const viewPreferencesKey = "materials";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/materials/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const filters: MaterialFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			category: searchParams.category || "",
			unit: searchParams.unit || "",
			model: searchParams.model || "",
			synced:
				searchParams.synced === "yes" || searchParams.synced === "no" ? searchParams.synced : "all",
			updatedFrom: searchParams.updatedFrom || undefined,
			updatedTo: searchParams.updatedTo || undefined,
		}),
		[
			searchParams.search,
			searchParams.category,
			searchParams.unit,
			searchParams.model,
			searchParams.synced,
			searchParams.updatedFrom,
			searchParams.updatedTo,
		],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" ||
			filters.category !== "" ||
			filters.unit !== "" ||
			filters.model !== "" ||
			filters.synced !== "all" ||
			Boolean(filters.updatedFrom) ||
			Boolean(filters.updatedTo)
		);
	}, [filters]);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized =
				typeof value === "string" ? (value.trim() ? value.trim() : undefined) : value || undefined;
			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: serialized,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(updates: Partial<MaterialFilters>) => {
			const nextSearch: MaterialSearchParams = {
				...searchParams,
				page: 1,
			};
			for (const [key, value] of Object.entries(updates)) {
				if (typeof value === "string") {
					(nextSearch as Record<string, unknown>)[key] = value.trim() ? value.trim() : undefined;
				} else {
					(nextSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: nextSearch,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: {
				page: 1,
				pageSize: searchParams.pageSize,
			},
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 30);
	}, [searchParams.page, searchParams.pageSize]);

	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<MaterialFilters>({ storageKey: "materials" });

	const systemPresets = useMemo((): SystemPreset<MaterialFilters>[] => {
		return [
			{ id: "synced", name: "已同步", filters: { synced: "yes" } },
			{ id: "unsynced", name: "未同步", filters: { synced: "no" } },
		];
	}, []);

	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);
	const currentActivePresetId = useMemo(
		() => matchPreset(filters, allPresets),
		[filters, allPresets, matchPreset],
	);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<MaterialFilters>) => {
			const next: Partial<MaterialFilters> = {
				search: "",
				category: "",
				unit: "",
				model: "",
				synced: "all",
				updatedFrom: undefined,
				updatedTo: undefined,
				...presetFilters,
			};
			setFilters(next);
			applyPreset(presetId);
		},
		[applyPreset, setFilters],
	);

	const { data, isLoading, error } = useMaterialList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		category: filters.category || undefined,
		unit: filters.unit || undefined,
		model: filters.model || undefined,
		synced: filters.synced,
		updatedFrom: filters.updatedFrom,
		updatedTo: filters.updatedTo,
		sort: searchParams.sort,
	});

	const initialSorting = useMemo(() => [{ id: "code", desc: false }], []);

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

	const handleSortingChange = useCallback(
		(nextSorting: { id: string; desc: boolean }[]) => {
			const serialized =
				nextSorting.length > 0
					? nextSorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(",")
					: undefined;
			navigate({
				to: ".",
				search: { ...searchParams, sort: serialized, page: 1 },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const columns = useMemo((): ColumnDef<MaterialListItem>[] => {
		return [
			{ accessorKey: "code", header: "编码" },
			{ accessorKey: "name", header: "名称" },
			{
				accessorKey: "category",
				header: "分类",
				cell: ({ row }) => row.original.category || "-",
			},
			{
				accessorKey: "unit",
				header: "单位",
				cell: ({ row }) => row.original.unit || "-",
			},
			{
				accessorKey: "model",
				header: "型号",
				cell: ({ row }) => row.original.model || "-",
			},
			{
				accessorKey: "sourceUpdatedAt",
				header: "同步时间",
				cell: ({ row }) => formatTime(row.original.sourceUpdatedAt),
			},
		];
	}, []);

	return (
		<DataListLayout
			mode="server"
			data={data?.items ?? []}
			columns={columns}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			onSortingChange={handleSortingChange}
			initialSorting={initialSorting}
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
					<h1 className="text-2xl font-bold tracking-tight">物料主数据</h1>
					<p className="text-muted-foreground">查看 ERP 同步的物料数据（含同步时间）。</p>
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
					{ key: "search", type: "search", placeholder: "搜索物料编码或名称..." },
					{
						key: "synced",
						type: "select",
						label: "同步",
						options: [
							{ label: "全部", value: "all" },
							{ label: "已同步", value: "yes" },
							{ label: "未同步", value: "no" },
						],
					},
					{
						key: "category",
						type: "custom",
						label: "分类",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="分类包含..."
								className="h-8 w-[180px]"
							/>
						),
					},
					{
						key: "unit",
						type: "custom",
						label: "单位",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="单位包含..."
								className="h-8 w-[140px]"
							/>
						),
					},
					{
						key: "model",
						type: "custom",
						label: "型号",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="型号包含..."
								className="h-8 w-[180px]"
							/>
						),
					},
					{
						key: "updatedRange",
						type: "dateRange",
						label: "同步时间",
						dateFromKey: "updatedFrom",
						dateToKey: "updatedTo",
					},
				],
				filters,
				onFilterChange: setFilter,
				onFiltersChange: (updates) => setFilters(updates as Partial<MaterialFilters>),
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item: MaterialListItem) => (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base flex items-center justify-between gap-2">
								<span className="font-mono">{item.code}</span>
								{item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground space-y-1">
							<div className="text-foreground">{item.name}</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1">
								<div>单位：{item.unit || "-"}</div>
								<div>型号：{item.model || "-"}</div>
							</div>
							<div>同步时间：{formatTime(item.sourceUpdatedAt)}</div>
						</CardContent>
					</Card>
				),
			}}
		/>
	);
}
