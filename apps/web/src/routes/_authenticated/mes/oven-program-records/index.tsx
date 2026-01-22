import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type OvenProgramRecord,
	useCreateOvenProgramRecord,
	useOvenProgramRecordList,
} from "@/hooks/use-oven-program-records";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	OvenProgramDialog,
	type OvenProgramFormValues,
} from "@/routes/_authenticated/mes/oven-program-records/-components/oven-program-dialog";
import { OvenProgramCard } from "./-components/oven-program-card";
import { ovenProgramColumns } from "./-components/oven-program-columns";

interface OvenProgramFilters {
	lineCode: string;
	equipmentId: string;
	productName: string;
	programName: string;
	recordFrom?: string;
	recordTo?: string;
}

const OVEN_PROGRAM_SYSTEM_PRESETS: SystemPreset<OvenProgramFilters>[] = [];

interface OvenProgramSearchParams {
	lineCode?: string;
	equipmentId?: string;
	productName?: string;
	programName?: string;
	recordFrom?: string;
	recordTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/oven-program-records/")({
	validateSearch: (search: Record<string, unknown>): OvenProgramSearchParams => ({
		lineCode: (search.lineCode as string) || undefined,
		equipmentId: (search.equipmentId as string) || undefined,
		productName: (search.productName as string) || undefined,
		programName: (search.programName as string) || undefined,
		recordFrom: (search.recordFrom as string) || undefined,
		recordTo: (search.recordTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: OvenProgramPage,
});

function OvenProgramPage() {
	const viewPreferencesKey = "oven-program-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateOvenProgramRecord();

	const filters: OvenProgramFilters = useMemo(
		() => ({
			lineCode: searchParams.lineCode || "",
			equipmentId: searchParams.equipmentId || "",
			productName: searchParams.productName || "",
			programName: searchParams.programName || "",
			recordFrom: searchParams.recordFrom || undefined,
			recordTo: searchParams.recordTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lineCode !== "" ||
			filters.equipmentId !== "" ||
			filters.productName !== "" ||
			filters.programName !== "" ||
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
		(newFilters: Partial<OvenProgramFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: OvenProgramSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<OvenProgramFilters>({
		storageKey: "oven-program-records",
	});

	const allPresets = useMemo(() => [...OVEN_PROGRAM_SYSTEM_PRESETS, ...userPresets], [userPresets]);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<OvenProgramFilters>) => {
			const newFilters: Partial<OvenProgramFilters> = {
				lineCode: "",
				equipmentId: "",
				productName: "",
				programName: "",
				recordFrom: undefined,
				recordTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useOvenProgramRecordList({
		page: pageIndex + 1,
		pageSize,
		lineCode: filters.lineCode || undefined,
		equipmentId: filters.equipmentId || undefined,
		productName: filters.productName || undefined,
		programName: filters.programName || undefined,
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

	const handleCreate = async (values: OvenProgramFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={ovenProgramColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">炉温程式记录</h1>
							<p className="text-muted-foreground">记录炉温程式使用信息与责任人。</p>
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
					systemPresets: OVEN_PROGRAM_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "programName", type: "search", placeholder: "搜索炉温程式..." },
						{ key: "productName", type: "search", placeholder: "搜索产品名称..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{ key: "equipmentId", type: "search", placeholder: "搜索设备编号..." },
						{
							key: "recordDate",
							type: "dateRange",
							label: "使用时间",
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
					renderCard: (record: OvenProgramRecord) => <OvenProgramCard record={record} />,
				}}
			/>

			<OvenProgramDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
