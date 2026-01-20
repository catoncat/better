import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type SolderPasteUsageRecord,
	useCreateSolderPasteUsageRecord,
	useSolderPasteUsageRecordList,
} from "@/hooks/use-solder-paste-usage";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	SolderPasteUsageDialog,
	type SolderPasteUsageFormValues,
} from "@/routes/_authenticated/mes/solder-paste-usage/-components/solder-paste-usage-dialog";
import { SolderPasteUsageCard } from "./-components/solder-paste-usage-card";
import { solderPasteUsageColumns } from "./-components/solder-paste-usage-columns";

interface SolderPasteUsageFilters {
	lotId: string;
	lineCode: string;
	receivedFrom?: string;
	receivedTo?: string;
	issuedFrom?: string;
	issuedTo?: string;
}

const SOLDER_PASTE_SYSTEM_PRESETS: SystemPreset<SolderPasteUsageFilters>[] = [];

interface SolderPasteUsageSearchParams {
	lotId?: string;
	lineCode?: string;
	receivedFrom?: string;
	receivedTo?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/solder-paste-usage/")({
	validateSearch: (search: Record<string, unknown>): SolderPasteUsageSearchParams => ({
		lotId: (search.lotId as string) || undefined,
		lineCode: (search.lineCode as string) || undefined,
		receivedFrom: (search.receivedFrom as string) || undefined,
		receivedTo: (search.receivedTo as string) || undefined,
		issuedFrom: (search.issuedFrom as string) || undefined,
		issuedTo: (search.issuedTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: SolderPasteUsagePage,
});

function SolderPasteUsagePage() {
	const viewPreferencesKey = "solder-paste-usage-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateSolderPasteUsageRecord();

	const filters: SolderPasteUsageFilters = useMemo(
		() => ({
			lotId: searchParams.lotId || "",
			lineCode: searchParams.lineCode || "",
			receivedFrom: searchParams.receivedFrom || undefined,
			receivedTo: searchParams.receivedTo || undefined,
			issuedFrom: searchParams.issuedFrom || undefined,
			issuedTo: searchParams.issuedTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lotId !== "" ||
			filters.lineCode !== "" ||
			Boolean(filters.receivedFrom) ||
			Boolean(filters.receivedTo) ||
			Boolean(filters.issuedFrom) ||
			Boolean(filters.issuedTo)
		);
	}, [filters]);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized = Array.isArray(value)
				? value.length > 0
					? value.join(",")
					: undefined
				: value || undefined;

			navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					[key]: serialized,
					page: 1,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	const setFilters = useCallback(
		(newFilters: Partial<SolderPasteUsageFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: SolderPasteUsageSearchParams = { ...prev, page: 1 };
					for (const [key, value] of Object.entries(newFilters)) {
						if (Array.isArray(value)) {
							(nextSearch as Record<string, unknown>)[key] =
								value.length > 0 ? value.join(",") : undefined;
						} else {
							(nextSearch as Record<string, unknown>)[key] = value || undefined;
						}
					}
					return nextSearch;
				},
				replace: true,
			});
		},
		[navigate],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: (prev) => ({
				page: 1,
				pageSize: prev.pageSize,
			}),
			replace: true,
		});
	}, [navigate]);

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
	} = useQueryPresets<SolderPasteUsageFilters>({
		storageKey: "solder-paste-usage-records",
	});

	const allPresets = useMemo(
		() => [...SOLDER_PASTE_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<SolderPasteUsageFilters>) => {
			const newFilters: Partial<SolderPasteUsageFilters> = {
				lotId: "",
				lineCode: "",
				receivedFrom: undefined,
				receivedTo: undefined,
				issuedFrom: undefined,
				issuedTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useSolderPasteUsageRecordList({
		page: pageIndex + 1,
		pageSize,
		lotId: filters.lotId || undefined,
		lineCode: filters.lineCode || undefined,
		receivedFrom: filters.receivedFrom,
		receivedTo: filters.receivedTo,
		issuedFrom: filters.issuedFrom,
		issuedTo: filters.issuedTo,
	});

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					page: next.pageIndex + 1,
					pageSize: next.pageSize,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	const handleCreate = async (values: SolderPasteUsageFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={solderPasteUsageColumns}
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
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">锡膏使用记录</h1>
							<p className="text-muted-foreground">
								记录锡膏收料、解冻、领用与回收的关键时间。
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="secondary" size="sm" onClick={() => void refetch()}>
								刷新列表
							</Button>
							<Can permissions={Permission.READINESS_CHECK}>
								<Button size="sm" onClick={() => setDialogOpen(true)}>
									<Plus className="mr-2 h-4 w-4" />
									新增记录
								</Button>
							</Can>
						</div>
					</div>
				}
				queryPresetBarProps={{
					systemPresets: SOLDER_PASTE_SYSTEM_PRESETS,
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
							key: "lotId",
							type: "search",
							placeholder: "搜索批次号...",
						},
						{
							key: "lineCode",
							type: "search",
							placeholder: "搜索产线...",
						},
						{
							key: "receivedAt",
							type: "dateRange",
							label: "收料时间",
							dateFromKey: "receivedFrom",
							dateToKey: "receivedTo",
						},
						{
							key: "issuedAt",
							type: "dateRange",
							label: "领用时间",
							dateFromKey: "issuedFrom",
							dateToKey: "issuedTo",
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
					renderCard: (record: SolderPasteUsageRecord) => (
						<SolderPasteUsageCard record={record} />
					),
				}}
			/>

			<SolderPasteUsageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
