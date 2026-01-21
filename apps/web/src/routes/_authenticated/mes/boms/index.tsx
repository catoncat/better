import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAbility } from "@/hooks/use-ability";
import { type BomParentListItem, useBomParentList } from "@/hooks/use-boms";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { formatDateTime } from "@/lib/utils";

interface BomFilters {
	search: string;
	parentCode: string;
	synced: "all" | "yes" | "no";
	updatedFrom?: string;
	updatedTo?: string;
}

interface BomSearchParams {
	search?: string;
	parentCode?: string;
	synced?: string;
	updatedFrom?: string;
	updatedTo?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/boms/")({
	validateSearch: (search: Record<string, unknown>): BomSearchParams => ({
		search: (search.search as string) || undefined,
		parentCode: (search.parentCode as string) || undefined,
		synced: (search.synced as string) || undefined,
		updatedFrom: (search.updatedFrom as string) || undefined,
		updatedTo: (search.updatedTo as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 20,
	}),
	component: BomPage,
});

function BomPage() {
	const viewPreferencesKey = "boms";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/boms/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canViewBoms = hasPermission(Permission.ROUTE_READ);

	const [activeItem, setActiveItem] = useState<BomParentListItem | null>(null);

	const filters: BomFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			parentCode: searchParams.parentCode || "",
			synced:
				searchParams.synced === "yes" || searchParams.synced === "no" ? searchParams.synced : "all",
			updatedFrom: searchParams.updatedFrom || undefined,
			updatedTo: searchParams.updatedTo || undefined,
		}),
		[
			searchParams.search,
			searchParams.parentCode,
			searchParams.synced,
			searchParams.updatedFrom,
			searchParams.updatedTo,
		],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" ||
			filters.parentCode !== "" ||
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
		(updates: Partial<BomFilters>) => {
			const nextSearch: BomSearchParams = {
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
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 20);

	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 20);
	}, [searchParams.page, searchParams.pageSize]);

	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<BomFilters>({ storageKey: "boms" });

	const systemPresets = useMemo((): SystemPreset<BomFilters>[] => {
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
		(presetId: string, presetFilters: Partial<BomFilters>) => {
			const next: Partial<BomFilters> = {
				search: "",
				parentCode: "",
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

	const { data, isLoading, error } = useBomParentList(
		{
			page: pageIndex + 1,
			pageSize,
			search: filters.search || undefined,
			parentCode: filters.parentCode || undefined,
			synced: filters.synced,
			updatedFrom: filters.updatedFrom,
			updatedTo: filters.updatedTo,
			sort: searchParams.sort,
		},
		{ enabled: canViewBoms },
	);

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

	const initialSorting = useMemo(() => [{ id: "parentCode", desc: false }], []);

	const columns = useMemo((): ColumnDef<BomParentListItem>[] => {
		return [
			{
				accessorKey: "parentCode",
				header: "父物料",
				cell: ({ row }) => (
					<div className="space-y-0.5">
						<div className="font-mono">{row.original.parentCode}</div>
						<div className="text-xs text-muted-foreground">{row.original.parentName || "-"}</div>
					</div>
				),
			},
			{
				accessorKey: "childrenCount",
				header: "子项数",
				cell: ({ row }) => row.original.children.length,
			},
			{
				accessorKey: "latestSourceUpdatedAt",
				header: "同步时间",
				cell: ({ row }) => formatDateTime(row.original.latestSourceUpdatedAt),
			},
			{
				id: "actions",
				header: "明细",
				cell: ({ row }) => (
					<Button variant="secondary" size="sm" onClick={() => setActiveItem(row.original)}>
						查看
					</Button>
				),
			},
		];
	}, []);

	const header = (
		<div className="flex flex-col gap-2">
			<h1 className="text-2xl font-bold tracking-tight">BOM</h1>
			<p className="text-muted-foreground">按父物料查看 BOM 关系（parent → child → qty）。</p>
		</div>
	);

	if (!canViewBoms) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要路由查看权限才能查看 BOM 关系。" />
			</div>
		);
	}

	return (
		<>
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={columns}
				pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
				onPaginationChange={handlePaginationChange}
				onSortingChange={handleSortingChange}
				initialSorting={initialSorting}
				initialPageIndex={(searchParams.page || 1) - 1}
				initialPageSize={searchParams.pageSize || 20}
				locationSearch={locationSearch}
				isLoading={isLoading}
				error={
					error ? (
						<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
							加载失败：{error instanceof Error ? error.message : "未知错误"}
						</div>
					) : null
				}
				header={header}
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
						{ key: "search", type: "search", placeholder: "搜索父/子物料编码..." },
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
							key: "parentCode",
							type: "custom",
							label: "父物料",
							render: (value, onChange) => (
								<Input
									value={(value as string) || ""}
									onChange={(e) => onChange(e.target.value)}
									placeholder="父物料编码包含..."
									className="h-8 w-[220px]"
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
					onFiltersChange: (updates) => setFilters(updates as Partial<BomFilters>),
					onReset: resetFilters,
					isFiltered,
					viewPreferencesKey,
				}}
				dataListViewProps={{
					viewPreferencesKey,
					renderCard: (item: BomParentListItem) => (
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base flex items-center justify-between gap-2">
									<span className="font-mono">{item.parentCode}</span>
									<Badge variant="secondary">{item.children.length} 子项</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground space-y-2">
								<div className="text-foreground">{item.parentName || "-"}</div>
								<div>同步时间：{formatDateTime(item.latestSourceUpdatedAt)}</div>
								<div className="space-y-1">
									{item.children.slice(0, 5).map((c) => (
										<div key={c.childCode} className="flex items-center justify-between gap-4">
											<div className="font-mono">{c.childCode}</div>
											<div className="text-xs text-muted-foreground truncate flex-1">
												{c.childName || ""}
											</div>
											<div className="shrink-0">
												{c.qty}
												{c.unit ? ` ${c.unit}` : ""}
											</div>
										</div>
									))}
									{item.children.length > 5 ? (
										<Button variant="secondary" size="sm" onClick={() => setActiveItem(item)}>
											查看全部
										</Button>
									) : null}
								</div>
							</CardContent>
						</Card>
					),
				}}
			/>

			<Dialog
				open={Boolean(activeItem)}
				onOpenChange={(open) => {
					if (!open) setActiveItem(null);
				}}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							<span className="font-mono">{activeItem?.parentCode}</span> BOM 明细
						</DialogTitle>
					</DialogHeader>
					{activeItem ? (
						<div className="space-y-2">
							<div className="text-sm text-muted-foreground">
								同步时间：{formatDateTime(activeItem.latestSourceUpdatedAt)}
							</div>
							<div className="rounded-md border border-border divide-y">
								<div className="grid grid-cols-12 gap-2 p-2 text-xs text-muted-foreground">
									<div className="col-span-4">子物料</div>
									<div className="col-span-5">名称</div>
									<div className="col-span-2 text-right">用量</div>
									<div className="col-span-1 text-right">单位</div>
								</div>
								{activeItem.children.map((child) => (
									<div key={child.childCode} className="grid grid-cols-12 gap-2 p-2 text-sm">
										<div className="col-span-4 font-mono">{child.childCode}</div>
										<div className="col-span-5 truncate">{child.childName || "-"}</div>
										<div className="col-span-2 text-right tabular-nums">{child.qty}</div>
										<div className="col-span-1 text-right">{child.unit || "-"}</div>
									</div>
								))}
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
