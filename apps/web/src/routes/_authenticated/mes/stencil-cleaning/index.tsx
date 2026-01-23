import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	type StencilCleaningRecord,
	useCreateStencilCleaningRecord,
	useStencilCleaningRecordList,
} from "@/hooks/use-stencil-cleaning";
import {
	StencilCleaningDialog,
	type StencilCleaningFormValues,
} from "@/routes/_authenticated/mes/stencil-cleaning/-components/stencil-cleaning-dialog";
import { StencilCleaningCard } from "./-components/stencil-cleaning-card";
import { stencilCleaningColumns } from "./-components/stencil-cleaning-columns";

interface StencilCleaningFilters {
	stencilId: string;
	runNo: string;
	lineCode: string;
	cleanedBy: string;
	cleanedFrom?: string;
	cleanedTo?: string;
}

const STENCIL_CLEANING_SYSTEM_PRESETS: SystemPreset<StencilCleaningFilters>[] = [];

interface StencilCleaningSearchParams {
	stencilId?: string;
	runNo?: string;
	lineCode?: string;
	cleanedBy?: string;
	cleanedFrom?: string;
	cleanedTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/stencil-cleaning/")({
	validateSearch: (search: Record<string, unknown>): StencilCleaningSearchParams => ({
		stencilId: (search.stencilId as string) || undefined,
		runNo: (search.runNo as string) || undefined,
		lineCode: (search.lineCode as string) || undefined,
		cleanedBy: (search.cleanedBy as string) || undefined,
		cleanedFrom: (search.cleanedFrom as string) || undefined,
		cleanedTo: (search.cleanedTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: StencilCleaningPage,
});

function StencilCleaningPage() {
	const viewPreferencesKey = "stencil-cleaning-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateStencilCleaningRecord();

	const filters: StencilCleaningFilters = useMemo(
		() => ({
			stencilId: searchParams.stencilId || "",
			runNo: searchParams.runNo || "",
			lineCode: searchParams.lineCode || "",
			cleanedBy: searchParams.cleanedBy || "",
			cleanedFrom: searchParams.cleanedFrom || undefined,
			cleanedTo: searchParams.cleanedTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.stencilId !== "" ||
			filters.runNo !== "" ||
			filters.lineCode !== "" ||
			filters.cleanedBy !== "" ||
			Boolean(filters.cleanedFrom) ||
			Boolean(filters.cleanedTo)
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
		(newFilters: Partial<StencilCleaningFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: StencilCleaningSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<StencilCleaningFilters>({
		storageKey: "stencil-cleaning-records",
	});

	const allPresets = useMemo(
		() => [...STENCIL_CLEANING_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<StencilCleaningFilters>) => {
			const newFilters: Partial<StencilCleaningFilters> = {
				stencilId: "",
				runNo: "",
				lineCode: "",
				cleanedBy: "",
				cleanedFrom: undefined,
				cleanedTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useStencilCleaningRecordList({
		page: pageIndex + 1,
		pageSize,
		stencilId: filters.stencilId || undefined,
		runNo: filters.runNo || undefined,
		lineCode: filters.lineCode || undefined,
		cleanedBy: filters.cleanedBy || undefined,
		cleanedFrom: filters.cleanedFrom,
		cleanedTo: filters.cleanedTo,
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

	const handleCreate = async (values: StencilCleaningFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={stencilCleaningColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">钢网清洗记录</h1>
							<p className="text-muted-foreground">记录钢网清洗时间、人员与确认信息。</p>
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
					systemPresets: STENCIL_CLEANING_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "stencilId", type: "search", placeholder: "搜索钢网编号..." },
						{ key: "runNo", type: "search", placeholder: "搜索生产批次号..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{ key: "cleanedBy", type: "search", placeholder: "搜索清洗人..." },
						{
							key: "cleanedAt",
							type: "dateRange",
							label: "清洗时间",
							dateFromKey: "cleanedFrom",
							dateToKey: "cleanedTo",
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
					renderCard: (record: StencilCleaningRecord) => <StencilCleaningCard record={record} />,
				}}
			/>

			<StencilCleaningDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
				defaultRunNo={filters.runNo || undefined}
				defaultLineCode={filters.lineCode || undefined}
			/>
		</div>
	);
}
