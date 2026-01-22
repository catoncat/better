import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	type SqueegeeUsageRecord,
	useCreateSqueegeeUsageRecord,
	useSqueegeeUsageRecordList,
} from "@/hooks/use-squeegee-usage";
import {
	SqueegeeUsageDialog,
	type SqueegeeUsageFormValues,
} from "@/routes/_authenticated/mes/squeegee-usage/-components/squeegee-usage-dialog";
import { SqueegeeUsageCard } from "./-components/squeegee-usage-card";
import { squeegeeUsageColumns } from "./-components/squeegee-usage-columns";

interface SqueegeeUsageFilters {
	squeegeeId: string;
	lineCode: string;
	productModel: string;
	recordFrom?: string;
	recordTo?: string;
}

const SQUEEGEE_USAGE_SYSTEM_PRESETS: SystemPreset<SqueegeeUsageFilters>[] = [];

interface SqueegeeUsageSearchParams {
	squeegeeId?: string;
	lineCode?: string;
	productModel?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/squeegee-usage/")({
	validateSearch: (search: Record<string, unknown>): SqueegeeUsageSearchParams => ({
		squeegeeId: (search.squeegeeId as string) || undefined,
		lineCode: (search.lineCode as string) || undefined,
		productModel: (search.productModel as string) || undefined,
		recordFrom: (search.recordFrom as string) || undefined,
		recordTo: (search.recordTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: SqueegeeUsagePage,
});

function SqueegeeUsagePage() {
	const viewPreferencesKey = "squeegee-usage-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateSqueegeeUsageRecord();

	const filters: SqueegeeUsageFilters = useMemo(
		() => ({
			squeegeeId: searchParams.squeegeeId || "",
			lineCode: searchParams.lineCode || "",
			productModel: searchParams.productModel || "",
			recordFrom: searchParams.recordFrom || undefined,
			recordTo: searchParams.recordTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.squeegeeId !== "" ||
			filters.lineCode !== "" ||
			filters.productModel !== "" ||
			Boolean(filters.recordFrom) ||
			Boolean(filters.recordTo)
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
		(newFilters: Partial<SqueegeeUsageFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: SqueegeeUsageSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<SqueegeeUsageFilters>({
		storageKey: "squeegee-usage-records",
	});

	const allPresets = useMemo(
		() => [...SQUEEGEE_USAGE_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<SqueegeeUsageFilters>) => {
			const newFilters: Partial<SqueegeeUsageFilters> = {
				squeegeeId: "",
				lineCode: "",
				productModel: "",
				recordFrom: undefined,
				recordTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useSqueegeeUsageRecordList({
		page: pageIndex + 1,
		pageSize,
		squeegeeId: filters.squeegeeId || undefined,
		lineCode: filters.lineCode || undefined,
		productModel: filters.productModel || undefined,
		recordFrom: filters.recordFrom,
		recordTo: filters.recordTo,
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

	const handleCreate = async (values: SqueegeeUsageFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={squeegeeUsageColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">刮刀使用记录</h1>
							<p className="text-muted-foreground">记录刮刀使用次数、检查结果与责任人。</p>
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
					systemPresets: SQUEEGEE_USAGE_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "squeegeeId", type: "search", placeholder: "搜索刮刀编号..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{ key: "productModel", type: "search", placeholder: "搜索产品型号..." },
						{
							key: "recordDate",
							type: "dateRange",
							label: "记录时间",
							dateFromKey: "recordFrom",
							dateToKey: "recordTo",
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
					renderCard: (record: SqueegeeUsageRecord) => <SqueegeeUsageCard record={record} />,
				}}
			/>

			<SqueegeeUsageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
