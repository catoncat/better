import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type ColdStorageTemperatureRecord,
	useColdStorageTemperatureRecordList,
	useCreateColdStorageTemperatureRecord,
} from "@/hooks/use-cold-storage-temperatures";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	ColdStorageTemperatureDialog,
	type ColdStorageTemperatureFormValues,
} from "@/routes/_authenticated/mes/cold-storage-temperatures/-components/cold-storage-temperature-dialog";
import { ColdStorageTemperatureCard } from "./-components/cold-storage-temperature-card";
import { coldStorageTemperatureColumns } from "./-components/cold-storage-temperature-columns";

interface ColdStorageTemperatureFilters {
	measuredFrom?: string;
	measuredTo?: string;
}

const COLD_STORAGE_SYSTEM_PRESETS: SystemPreset<ColdStorageTemperatureFilters>[] = [];

interface ColdStorageTemperatureSearchParams {
	measuredFrom?: string;
	measuredTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/cold-storage-temperatures/")({
	validateSearch: (search: Record<string, unknown>): ColdStorageTemperatureSearchParams => ({
		measuredFrom: (search.measuredFrom as string) || undefined,
		measuredTo: (search.measuredTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: ColdStorageTemperaturePage,
});

function ColdStorageTemperaturePage() {
	const viewPreferencesKey = "cold-storage-temperature-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateColdStorageTemperatureRecord();

	const filters: ColdStorageTemperatureFilters = useMemo(
		() => ({
			measuredFrom: searchParams.measuredFrom || undefined,
			measuredTo: searchParams.measuredTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return Boolean(filters.measuredFrom) || Boolean(filters.measuredTo);
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
		(newFilters: Partial<ColdStorageTemperatureFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: ColdStorageTemperatureSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<ColdStorageTemperatureFilters>({
		storageKey: "cold-storage-temperature-records",
	});

	const allPresets = useMemo(
		() => [...COLD_STORAGE_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<ColdStorageTemperatureFilters>) => {
			const newFilters: Partial<ColdStorageTemperatureFilters> = {
				measuredFrom: undefined,
				measuredTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useColdStorageTemperatureRecordList({
		page: pageIndex + 1,
		pageSize,
		measuredFrom: filters.measuredFrom,
		measuredTo: filters.measuredTo,
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

	const handleCreate = async (values: ColdStorageTemperatureFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={coldStorageTemperatureColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">冷藏温度记录</h1>
							<p className="text-muted-foreground">记录 SMT 冷藏柜的温度测量结果。</p>
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
					systemPresets: COLD_STORAGE_SYSTEM_PRESETS,
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
							key: "measuredAt",
							type: "dateRange",
							label: "测量时间",
							dateFromKey: "measuredFrom",
							dateToKey: "measuredTo",
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
					renderCard: (record: ColdStorageTemperatureRecord) => (
						<ColdStorageTemperatureCard record={record} />
					),
				}}
			/>

			<ColdStorageTemperatureDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
