import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { type BakeRecord, useBakeRecordList, useCreateBakeRecord } from "@/hooks/use-bake-records";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	BakeRecordDialog,
	type BakeRecordFormValues,
} from "@/routes/_authenticated/mes/bake-records/-components/bake-record-dialog";
import { BakeRecordCard } from "./-components/bake-record-card";
import { bakeRecordColumns } from "./-components/bake-record-columns";

interface BakeRecordFilters {
	runNo: string;
	itemCode: string;
	bakeProcess: string;
	inFrom?: string;
	inTo?: string;
}

const BAKE_SYSTEM_PRESETS: SystemPreset<BakeRecordFilters>[] = [];

interface BakeRecordSearchParams {
	runNo?: string;
	itemCode?: string;
	bakeProcess?: string;
	inFrom?: string;
	inTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/bake-records/")({
	validateSearch: (search: Record<string, unknown>): BakeRecordSearchParams => ({
		runNo: (search.runNo as string) || undefined,
		itemCode: (search.itemCode as string) || undefined,
		bakeProcess: (search.bakeProcess as string) || undefined,
		inFrom: (search.inFrom as string) || undefined,
		inTo: (search.inTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: BakeRecordPage,
});

function BakeRecordPage() {
	const viewPreferencesKey = "bake-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateBakeRecord();

	const filters: BakeRecordFilters = useMemo(
		() => ({
			runNo: searchParams.runNo || "",
			itemCode: searchParams.itemCode || "",
			bakeProcess: searchParams.bakeProcess || "",
			inFrom: searchParams.inFrom || undefined,
			inTo: searchParams.inTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.runNo !== "" ||
			filters.itemCode !== "" ||
			filters.bakeProcess !== "" ||
			Boolean(filters.inFrom) ||
			Boolean(filters.inTo)
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
		(newFilters: Partial<BakeRecordFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: BakeRecordSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<BakeRecordFilters>({
		storageKey: "bake-records",
	});

	const allPresets = useMemo(() => [...BAKE_SYSTEM_PRESETS, ...userPresets], [userPresets]);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<BakeRecordFilters>) => {
			const newFilters: Partial<BakeRecordFilters> = {
				runNo: "",
				itemCode: "",
				bakeProcess: "",
				inFrom: undefined,
				inTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useBakeRecordList({
		page: pageIndex + 1,
		pageSize,
		runNo: filters.runNo || undefined,
		itemCode: filters.itemCode || undefined,
		bakeProcess: filters.bakeProcess || undefined,
		inFrom: filters.inFrom,
		inTo: filters.inTo,
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

	const handleCreate = async (values: BakeRecordFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={bakeRecordColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">烘烤记录</h1>
							<p className="text-muted-foreground">记录 SMT 产线物料烘烤时间与负责人。</p>
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
					systemPresets: BAKE_SYSTEM_PRESETS,
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
							key: "runNo",
							type: "search",
							placeholder: "搜索批次号...",
						},
						{
							key: "itemCode",
							type: "search",
							placeholder: "搜索产品/物料...",
						},
						{
							key: "bakeProcess",
							type: "search",
							placeholder: "搜索工序...",
						},
						{
							key: "inAt",
							type: "dateRange",
							label: "放入时间",
							dateFromKey: "inFrom",
							dateToKey: "inTo",
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
					renderCard: (record: BakeRecord) => <BakeRecordCard record={record} />,
				}}
			/>

			<BakeRecordDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
