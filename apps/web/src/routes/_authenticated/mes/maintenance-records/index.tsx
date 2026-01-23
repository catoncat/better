import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	type MaintenanceRecord,
	useCreateMaintenanceRecord,
	useMaintenanceRecordList,
} from "@/hooks/use-maintenance";
import { MaintenanceCard } from "./-components/maintenance-card";
import { maintenanceColumns } from "./-components/maintenance-columns";
import {
	MaintenanceDialog,
	type MaintenanceFormValues,
} from "./-components/maintenance-dialog";
import {
	MAINTENANCE_ENTITY_TYPE_LABELS,
	MAINTENANCE_STATUS_LABELS,
} from "./-components/maintenance-field-meta";

interface MaintenanceFilters {
	lineId: string;
	entityType: string;
	status: string;
	from?: string;
	to?: string;
}

const MAINTENANCE_SYSTEM_PRESETS: SystemPreset<MaintenanceFilters>[] = [
	{
		id: "pending",
		name: "待处理",
		filters: { lineId: "", entityType: "", status: "PENDING" },
	},
	{
		id: "in-progress",
		name: "进行中",
		filters: { lineId: "", entityType: "", status: "IN_PROGRESS" },
	},
	{
		id: "completed",
		name: "已完成",
		filters: { lineId: "", entityType: "", status: "COMPLETED" },
	},
];

interface MaintenanceSearchParams {
	lineId?: string;
	entityType?: string;
	status?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/maintenance-records/")(
	{
		validateSearch: (search: Record<string, unknown>): MaintenanceSearchParams => ({
			lineId: (search.lineId as string) || undefined,
			entityType: (search.entityType as string) || undefined,
			status: (search.status as string) || undefined,
			from: (search.from as string) || undefined,
			to: (search.to as string) || undefined,
			page: Number(search.page) || 1,
			pageSize: Number(search.pageSize) || 30,
		}),
		component: MaintenanceRecordsPage,
	},
);

function MaintenanceRecordsPage() {
	const viewPreferencesKey = "maintenance-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateMaintenanceRecord();

	const filters: MaintenanceFilters = useMemo(
		() => ({
			lineId: searchParams.lineId || "",
			entityType: searchParams.entityType || "",
			status: searchParams.status || "",
			from: searchParams.from || undefined,
			to: searchParams.to || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lineId !== "" ||
			filters.entityType !== "" ||
			filters.status !== "" ||
			Boolean(filters.from) ||
			Boolean(filters.to)
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
		(newFilters: Partial<MaintenanceFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: MaintenanceSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<MaintenanceFilters>({
		storageKey: "maintenance-records",
	});

	const allPresets = useMemo(
		() => [...MAINTENANCE_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<MaintenanceFilters>) => {
			const newFilters: Partial<MaintenanceFilters> = {
				lineId: "",
				entityType: "",
				status: "",
				from: undefined,
				to: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useMaintenanceRecordList({
		page: pageIndex + 1,
		pageSize,
		lineId: filters.lineId || undefined,
		entityType: filters.entityType || undefined,
		status: filters.status || undefined,
		from: filters.from,
		to: filters.to,
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

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={maintenanceColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">维修记录</h1>
							<p className="text-muted-foreground">管理夹具、钢网、刮刀等设备的维修记录。</p>
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
					systemPresets: MAINTENANCE_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "lineId", type: "search", placeholder: "搜索产线ID..." },
						{
							key: "entityType",
							type: "select",
							label: "实体类型",
							options: Object.entries(MAINTENANCE_ENTITY_TYPE_LABELS).map(([value, label]) => ({
								value,
								label,
							})),
						},
						{
							key: "status",
							type: "select",
							label: "状态",
							options: Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => ({
								value,
								label,
							})),
						},
						{
							key: "reportedAt",
							type: "dateRange",
							label: "报修时间",
							dateFromKey: "from",
							dateToKey: "to",
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
					renderCard: (record: MaintenanceRecord) => <MaintenanceCard record={record} />,
				}}
			/>

			<MaintenanceDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={async (values: MaintenanceFormValues) => {
					await createRecord.mutateAsync(values);
				}}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
