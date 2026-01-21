import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type EquipmentInspectionRecord,
	useCreateEquipmentInspectionRecord,
	useEquipmentInspectionRecordList,
} from "@/hooks/use-equipment-inspections";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	EquipmentInspectionDialog,
	type EquipmentInspectionFormValues,
} from "@/routes/_authenticated/mes/equipment-inspections/-components/equipment-inspection-dialog";
import { EquipmentInspectionCard } from "./-components/equipment-inspection-card";
import { equipmentInspectionColumns } from "./-components/equipment-inspection-columns";

interface EquipmentInspectionFilters {
	lineCode: string;
	machineName: string;
	equipmentType: string;
	result: string;
	inspectedFrom?: string;
	inspectedTo?: string;
}

const EQUIPMENT_INSPECTION_SYSTEM_PRESETS: SystemPreset<EquipmentInspectionFilters>[] = [];

interface EquipmentInspectionSearchParams {
	lineCode?: string;
	machineName?: string;
	equipmentType?: string;
	result?: string;
	inspectedFrom?: string;
	inspectedTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/equipment-inspections/")({
	validateSearch: (search: Record<string, unknown>): EquipmentInspectionSearchParams => ({
		lineCode: (search.lineCode as string) || undefined,
		machineName: (search.machineName as string) || undefined,
		equipmentType: (search.equipmentType as string) || undefined,
		result: (search.result as string) || undefined,
		inspectedFrom: (search.inspectedFrom as string) || undefined,
		inspectedTo: (search.inspectedTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: EquipmentInspectionPage,
});

function EquipmentInspectionPage() {
	const viewPreferencesKey = "equipment-inspection-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const createRecord = useCreateEquipmentInspectionRecord();

	const filters: EquipmentInspectionFilters = useMemo(
		() => ({
			lineCode: searchParams.lineCode || "",
			machineName: searchParams.machineName || "",
			equipmentType: searchParams.equipmentType || "",
			result: searchParams.result || "",
			inspectedFrom: searchParams.inspectedFrom || undefined,
			inspectedTo: searchParams.inspectedTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lineCode !== "" ||
			filters.machineName !== "" ||
			filters.equipmentType !== "" ||
			filters.result !== "" ||
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
		(newFilters: Partial<EquipmentInspectionFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: EquipmentInspectionSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<EquipmentInspectionFilters>({
		storageKey: "equipment-inspection-records",
	});

	const allPresets = useMemo(
		() => [...EQUIPMENT_INSPECTION_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<EquipmentInspectionFilters>) => {
			const newFilters: Partial<EquipmentInspectionFilters> = {
				lineCode: "",
				machineName: "",
				equipmentType: "",
				result: "",
				inspectedFrom: undefined,
				inspectedTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useEquipmentInspectionRecordList({
		page: pageIndex + 1,
		pageSize,
		lineCode: filters.lineCode || undefined,
		machineName: filters.machineName || undefined,
		equipmentType: filters.equipmentType || undefined,
		result: filters.result || undefined,
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

	const handleCreate = async (values: EquipmentInspectionFormValues) => {
		await createRecord.mutateAsync(values);
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={equipmentInspectionColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">设备点检记录</h1>
							<p className="text-muted-foreground">记录 AOI/SPI 设备每日点检结果。</p>
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
					systemPresets: EQUIPMENT_INSPECTION_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "machineName", type: "search", placeholder: "搜索设备名称..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{
							key: "equipmentType",
							type: "select",
							label: "设备类型",
							options: [
								{ label: "SPI", value: "SPI" },
								{ label: "AOI", value: "AOI" },
							],
						},
						{
							key: "result",
							type: "select",
							label: "点检结果",
							options: [
								{ label: "合格", value: "PASS" },
								{ label: "不合格", value: "FAIL" },
							],
						},
						{
							key: "inspectedAt",
							type: "dateRange",
							label: "点检时间",
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
					renderCard: (record: EquipmentInspectionRecord) => (
						<EquipmentInspectionCard record={record} />
					),
				}}
			/>

			<EquipmentInspectionDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
		</div>
	);
}
