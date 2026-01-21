import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import type { CardFieldDefinition } from "@/components/data-table/data-card";
import { type TableAction, TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAbility } from "@/hooks/use-ability";
import {
	type LineSummary,
	useCreateLine,
	useDeleteLine,
	useLineList,
	useUpdateLine,
} from "@/hooks/use-lines";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { PROCESS_TYPE_MAP } from "@/lib/constants";
import { LineDialog } from "./-components/line-dialog";

interface LineFilters {
	search: string;
	processType: LineSummary["processType"] | "all";
}

interface LineSearchParams {
	search?: string;
	processType?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/lines/")({
	validateSearch: (search: Record<string, unknown>): LineSearchParams => ({
		search: (search.search as string) || undefined,
		processType: (search.processType as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: LinesPage,
});

function LinesPage() {
	const viewPreferencesKey = "lines";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/lines/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const { hasPermission } = useAbility();
	const canManageLines = hasPermission(Permission.LINE_CONFIG);

	const processTypeValues = useMemo(
		() => Object.keys(PROCESS_TYPE_MAP) as LineSummary["processType"][],
		[],
	);
	const isProcessType = useCallback(
		(value?: string): value is LineSummary["processType"] =>
			Boolean(value && processTypeValues.includes(value as LineSummary["processType"])),
		[processTypeValues],
	);
	const filters: LineFilters = useMemo(() => {
		const processType = isProcessType(searchParams.processType) ? searchParams.processType : "all";
		return {
			search: searchParams.search || "",
			processType,
		};
	}, [isProcessType, searchParams.search, searchParams.processType]);

	const isFiltered = useMemo(
		() => filters.search !== "" || filters.processType !== "all",
		[filters.search, filters.processType],
	);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized =
				typeof value === "string" ? (value.trim() ? value.trim() : undefined) : value || undefined;
			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: serialized === "all" ? undefined : serialized,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(updates: Partial<LineFilters>) => {
			const nextSearch: LineSearchParams = {
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
	} = useQueryPresets<LineFilters>({ storageKey: "lines" });

	const systemPresets = useMemo((): SystemPreset<LineFilters>[] => {
		return Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => ({
			id: value,
			name: label,
			filters: { processType: value as LineSummary["processType"], search: "" },
		}));
	}, []);

	const formatProcessType = useCallback((value: unknown) => {
		if (typeof value === "string" && value in PROCESS_TYPE_MAP) {
			return PROCESS_TYPE_MAP[value as keyof typeof PROCESS_TYPE_MAP];
		}
		return value ? String(value) : "-";
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
		(presetId: string, presetFilters: Partial<LineFilters>) => {
			const next: Partial<LineFilters> = {
				search: "",
				processType: "all",
				...presetFilters,
			};
			setFilters(next);
			applyPreset(presetId);
		},
		[applyPreset, setFilters],
	);

	const { data, isLoading, isFetching, error } = useLineList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		processType: filters.processType,
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

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingLine, setEditingLine] = useState<LineSummary | null>(null);

	const createLine = useCreateLine();
	const updateLine = useUpdateLine(editingLine?.id ?? "");
	const deleteLine = useDeleteLine();

	const handleDialogOpenChange = useCallback((open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setEditingLine(null);
		}
	}, []);

	const handleCreate = useCallback(() => {
		setEditingLine(null);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((line: LineSummary) => {
		setEditingLine(line);
		setDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		async (line: LineSummary) => {
			if (!confirm(`确定删除产线 ${line.code} 吗？删除后不可恢复。`)) return;
			await deleteLine.mutateAsync(line.id);
		},
		[deleteLine],
	);

	const handleSubmit = useCallback(
		async (values: Parameters<typeof createLine.mutateAsync>[0]) => {
			if (editingLine) {
				await updateLine.mutateAsync(values);
			} else {
				await createLine.mutateAsync(values);
			}
		},
		[createLine, updateLine, editingLine],
	);

	const rowActions = useCallback(
		(line: LineSummary): TableAction[] => [
			{
				icon: Pencil,
				label: "编辑",
				onClick: () => handleEdit(line),
			},
			{
				icon: Trash2,
				label: "删除",
				onClick: () => handleDelete(line),
				destructive: true,
			},
		],
		[handleDelete, handleEdit],
	);

	const columns = useMemo((): ColumnDef<LineSummary>[] => {
		const base: ColumnDef<LineSummary>[] = [
			{
				accessorKey: "code",
				header: "产线代码",
				cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
			},
			{ accessorKey: "name", header: "产线名称" },
			{
				accessorKey: "processType",
				header: "工艺类型",
				cell: ({ row }) => (
					<Badge variant="outline">{formatProcessType(row.original.processType)}</Badge>
				),
			},
		];

		if (canManageLines) {
			base.push({
				id: "actions",
				header: "",
				cell: ({ row }) => <TableActions actions={rowActions(row.original)} />,
			});
		}

		return base;
	}, [canManageLines, rowActions, formatProcessType]);

	const cardFields = useMemo((): CardFieldDefinition<LineSummary>[] => {
		return [
			{
				key: "code",
				label: "产线代码",
				primary: true,
			},
			{
				key: "processType",
				badge: true,
				render: (value) => formatProcessType(value),
			},
			{
				key: "name",
				label: "产线名称",
			},
		];
	}, [formatProcessType]);

	const emptyMessage = isFiltered ? "没有匹配的产线" : "暂无产线";
	const isPending = createLine.isPending || updateLine.isPending;

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
				initialPageSize={searchParams.pageSize || 30}
				locationSearch={locationSearch}
				isLoading={isLoading}
				isFetching={isFetching}
				error={
					error ? (
						<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
							加载失败：{error instanceof Error ? error.message : "未知错误"}
						</div>
					) : null
				}
				header={
					<div className="flex items-center justify-between">
						<div className="space-y-2">
							<h1 className="text-2xl font-bold tracking-tight">产线管理</h1>
							<p className="text-muted-foreground">维护产线主数据与工艺类型配置。</p>
						</div>
						<Can permissions={Permission.LINE_CONFIG}>
							<Button onClick={handleCreate}>
								<Plus className="mr-2 h-4 w-4" />
								新建产线
							</Button>
						</Can>
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
						{ key: "search", type: "search", placeholder: "搜索产线代码或名称..." },
						{
							key: "processType",
							type: "select",
							label: "工艺类型",
							options: [
								{ label: "全部", value: "all" },
								...Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => ({
									label,
									value,
								})),
							],
						},
					],
					filters,
					onFilterChange: setFilter,
					onFiltersChange: setFilters,
					onReset: resetFilters,
					isFiltered,
					viewPreferencesKey,
				}}
				dataListViewProps={{
					viewPreferencesKey,
					emptyMessage,
					getItemActions: canManageLines ? rowActions : undefined,
					cardProps: { fields: cardFields },
				}}
			/>

			<LineDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				line={editingLine}
				onSubmit={handleSubmit}
				isPending={isPending}
			/>
		</>
	);
}
