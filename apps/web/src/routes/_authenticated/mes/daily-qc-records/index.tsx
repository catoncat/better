import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type DailyQcRecord,
	useCreateDailyQcRecord,
	useDailyQcRecordList,
} from "@/hooks/use-daily-qc-records";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	DailyQcDialog,
	type DailyQcFormValues,
} from "@/routes/_authenticated/mes/daily-qc-records/-components/daily-qc-dialog";
import { DailyQcCard } from "./-components/daily-qc-card";
import { dailyQcColumns } from "./-components/daily-qc-columns";

interface DailyQcFilters {
	lineCode: string;
	jobNo: string;
	customer: string;
	station: string;
	shiftCode: string;
	inspectedFrom?: string;
	inspectedTo?: string;
}

const DAILY_QC_SYSTEM_PRESETS: SystemPreset<DailyQcFilters>[] = [];

interface DailyQcSearchParams {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	station?: string;
	shiftCode?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/daily-qc-records/")({
	validateSearch: (search: Record<string, unknown>): DailyQcSearchParams => ({
		lineCode: (search.lineCode as string) || undefined,
		jobNo: (search.jobNo as string) || undefined,
		customer: (search.customer as string) || undefined,
		station: (search.station as string) || undefined,
		shiftCode: (search.shiftCode as string) || undefined,
		inspectedFrom: (search.inspectedFrom as string) || undefined,
		inspectedTo: (search.inspectedTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: DailyQcPage,
});

function DailyQcPage() {
	const viewPreferencesKey = "daily-qc-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateDailyQcRecord();

	const filters: DailyQcFilters = useMemo(
		() => ({
			lineCode: searchParams.lineCode || "",
			jobNo: searchParams.jobNo || "",
			customer: searchParams.customer || "",
			station: searchParams.station || "",
			shiftCode: searchParams.shiftCode || "",
			inspectedFrom: searchParams.inspectedFrom || undefined,
			inspectedTo: searchParams.inspectedTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lineCode !== "" ||
			filters.jobNo !== "" ||
			filters.customer !== "" ||
			filters.station !== "" ||
			filters.shiftCode !== "" ||
			Boolean(filters.inspectedFrom) ||
			Boolean(filters.inspectedTo)
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
		(newFilters: Partial<DailyQcFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: DailyQcSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<DailyQcFilters>({
		storageKey: "daily-qc-records",
	});

	const allPresets = useMemo(() => [...DAILY_QC_SYSTEM_PRESETS, ...userPresets], [userPresets]);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<DailyQcFilters>) => {
			const newFilters: Partial<DailyQcFilters> = {
				lineCode: "",
				jobNo: "",
				customer: "",
				station: "",
				shiftCode: "",
				inspectedFrom: undefined,
				inspectedTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useDailyQcRecordList({
		page: pageIndex + 1,
		pageSize,
		lineCode: filters.lineCode || undefined,
		jobNo: filters.jobNo || undefined,
		customer: filters.customer || undefined,
		station: filters.station || undefined,
		shiftCode: filters.shiftCode || undefined,
		inspectedFrom: filters.inspectedFrom,
		inspectedTo: filters.inspectedTo,
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

	const handleCreate = async (values: DailyQcFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={dailyQcColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">日常QC记录</h1>
							<p className="text-muted-foreground">记录日常 QC 检验统计与异常信息。</p>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="secondary" size="sm" onClick={() => void refetch()}>
								刷新列表
							</Button>
							<Can permissions={Permission.QUALITY_OQC}>
								<Button size="sm" onClick={() => setDialogOpen(true)}>
									<Plus className="mr-2 h-4 w-4" />
									新增记录
								</Button>
							</Can>
						</div>
					</div>
				}
				queryPresetBarProps={{
					systemPresets: DAILY_QC_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "jobNo", type: "search", placeholder: "搜索任务/工单号..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{ key: "customer", type: "search", placeholder: "搜索客户..." },
						{ key: "station", type: "search", placeholder: "搜索工序..." },
						{ key: "shiftCode", type: "search", placeholder: "搜索班次..." },
						{
							key: "inspectedAt",
							type: "dateRange",
							label: "检验时间",
							dateFromKey: "inspectedFrom",
							dateToKey: "inspectedTo",
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
					renderCard: (record: DailyQcRecord) => <DailyQcCard record={record} />,
				}}
			/>

			<DailyQcDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
