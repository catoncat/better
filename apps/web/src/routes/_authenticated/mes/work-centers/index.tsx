import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { useWorkCenterList, type WorkCenterListItem } from "@/hooks/use-work-centers";
import { formatDateTime } from "@/lib/utils";

interface WorkCenterFilters {
	search: string;
	departmentCode: string;
	stationGroupCode: string;
	synced: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
}

interface WorkCenterSearchParams {
	search?: string;
	departmentCode?: string;
	stationGroupCode?: string;
	synced?: string;
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/work-centers/")({
	validateSearch: (search: Record<string, unknown>): WorkCenterSearchParams => ({
		search: (search.search as string) || undefined,
		departmentCode: (search.departmentCode as string) || undefined,
		stationGroupCode: (search.stationGroupCode as string) || undefined,
		synced: (search.synced as string) || undefined,
		updatedFrom: (search.updatedFrom as string) || undefined,
		updatedTo: (search.updatedTo as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: WorkCentersPage,
});

function WorkCentersPage() {
	const viewPreferencesKey = "work-centers";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/work-centers/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const filters: WorkCenterFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			departmentCode: searchParams.departmentCode || "",
			stationGroupCode: searchParams.stationGroupCode || "",
			synced:
				searchParams.synced === "yes" || searchParams.synced === "no" ? searchParams.synced : "all",
			updatedFrom: searchParams.updatedFrom || undefined,
			updatedTo: searchParams.updatedTo || undefined,
		}),
		[
			searchParams.search,
			searchParams.departmentCode,
			searchParams.stationGroupCode,
			searchParams.synced,
			searchParams.updatedFrom,
			searchParams.updatedTo,
		],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" ||
			filters.departmentCode !== "" ||
			filters.stationGroupCode !== "" ||
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
		(updates: Partial<WorkCenterFilters>) => {
			const nextSearch: WorkCenterSearchParams = {
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
	} = useQueryPresets<WorkCenterFilters>({ storageKey: "work-centers" });

	const systemPresets = useMemo((): SystemPreset<WorkCenterFilters>[] => {
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
		(presetId: string, presetFilters: Partial<WorkCenterFilters>) => {
			const next: Partial<WorkCenterFilters> = {
				search: "",
				departmentCode: "",
				stationGroupCode: "",
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

	const { data, isLoading, error } = useWorkCenterList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		departmentCode: filters.departmentCode || undefined,
		stationGroupCode: filters.stationGroupCode || undefined,
		synced: filters.synced,
		updatedFrom: filters.updatedFrom,
		updatedTo: filters.updatedTo,
		sort: searchParams.sort,
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

	const initialSorting = useMemo(() => [{ id: "code", desc: false }], []);

	const columns = useMemo((): ColumnDef<WorkCenterListItem>[] => {
		return [
			{
				accessorKey: "code",
				header: "编码",
				cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
			},
			{ accessorKey: "name", header: "名称" },
			{
				accessorKey: "departmentCode",
				header: "部门",
				cell: ({ row }) =>
					row.original.departmentCode ? (
						<div className="space-y-0.5">
							<div className="font-mono">{row.original.departmentCode}</div>
							<div className="text-xs text-muted-foreground">
								{row.original.departmentName || "-"}
							</div>
						</div>
					) : (
						"-"
					),
			},
			{
				accessorKey: "stationGroup",
				header: "工位组",
				cell: ({ row }) => (row.original.stationGroup ? row.original.stationGroup.name : "-"),
			},
			{
				accessorKey: "lineCodes",
				header: "产线",
				cell: ({ row }) =>
					row.original.lineCodes.length > 0 ? row.original.lineCodes.join(", ") : "-",
			},
			{
				accessorKey: "sourceUpdatedAt",
				header: "同步时间",
				cell: ({ row }) => formatDateTime(row.original.sourceUpdatedAt),
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
					<h1 className="text-2xl font-bold tracking-tight">工作中心</h1>
					<p className="text-muted-foreground">查看工作中心与产线/工位组映射关系。</p>
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
					{ key: "search", type: "search", placeholder: "搜索工作中心/部门/工位组..." },
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
						key: "departmentCode",
						type: "custom",
						label: "部门编码",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="部门编码包含..."
								className="h-8 w-[200px]"
							/>
						),
					},
					{
						key: "stationGroupCode",
						type: "custom",
						label: "工位组",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="工位组编码包含..."
								className="h-8 w-[200px]"
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
				onFiltersChange: (updates) => setFilters(updates as Partial<WorkCenterFilters>),
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item: WorkCenterListItem) => (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base flex items-center justify-between gap-2">
								<span className="font-mono">{item.code}</span>
								{item.stationGroup ? (
									<Badge variant="secondary">{item.stationGroup.name}</Badge>
								) : null}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground space-y-1">
							<div className="text-foreground">{item.name}</div>
							<div>
								部门：
								{item.departmentCode ? `${item.departmentCode} ${item.departmentName || ""}` : "-"}
							</div>
							<div>产线：{item.lineCodes.length > 0 ? item.lineCodes.join(", ") : "-"}</div>
							<div>同步时间：{formatDateTime(item.sourceUpdatedAt)}</div>
						</CardContent>
					</Card>
				),
			}}
		/>
	);
}
