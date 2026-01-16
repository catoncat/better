import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type OqcInspection,
	useCompleteOqc,
	useOqcDetail,
	useOqcList,
	useRecordOqcItem,
	useStartOqc,
} from "@/hooks/use-oqc";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { INSPECTION_STATUS_MAP } from "@/lib/constants";
import { OqcCard } from "../-components/oqc-card";
import { type OqcTableMeta, oqcColumns } from "../-components/oqc-columns";
import { OqcCompleteDialog, type OqcCompleteFormValues } from "../-components/oqc-complete-dialog";
import { OqcRecordDialog, type OqcRecordFormValues } from "../-components/oqc-record-dialog";

interface OqcFilters {
	runNo: string;
	status: string[];
}

// 静态系统预设 - 提升到模块级别避免不必要的重新创建
const OQC_SYSTEM_PRESETS: SystemPreset<OqcFilters>[] = [
	{ id: "pending", name: "待开始", filters: { status: ["PENDING"] } },
	{ id: "inspecting", name: "检验中", filters: { status: ["INSPECTING"] } },
	{ id: "failed", name: "失败记录", filters: { status: ["FAIL"] } },
	{ id: "done", name: "已完成", filters: { status: ["PASS", "FAIL"] } },
];

// 静态状态选项
const STATUS_OPTIONS = Object.entries(INSPECTION_STATUS_MAP).map(([value, label]) => ({
	label,
	value,
}));

interface OqcSearchParams {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/oqc/")({
	validateSearch: (search: Record<string, unknown>): OqcSearchParams => ({
		runNo: (search.runNo as string) || undefined,
		status: (search.status as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: OqcPage,
});

function OqcPage() {
	const viewPreferencesKey = "oqc";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [selectedOqcId, setSelectedOqcId] = useState<string | null>(null);
	const [recordDialogOpen, setRecordDialogOpen] = useState(false);
	const [recordReadOnly, setRecordReadOnly] = useState(false);
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

	const filters: OqcFilters = useMemo(
		() => ({
			runNo: searchParams.runNo || "",
			status: searchParams.status?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.runNo !== "" || filters.status.length > 0;
	}, [filters]);

	// Update URL with new filters
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
		(newFilters: Partial<OqcFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: OqcSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<OqcFilters>({
		storageKey: "oqc",
		sortableArrayKeys: ["status"],
	});

	// All presets for matching - 使用模块级常量
	const allPresets = useMemo(() => [...OQC_SYSTEM_PRESETS, ...userPresets], [userPresets]);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<OqcFilters>) => {
			const newFilters: Partial<OqcFilters> = {
				runNo: "",
				status: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useOqcList({
		page: pageIndex + 1,
		pageSize,
		runNo: filters.runNo || undefined,
		status: filters.status.length > 0 ? filters.status.join(",") : undefined,
	});

	const { data: selectedOqcDetail } = useOqcDetail(selectedOqcId ?? undefined);
	const startOqc = useStartOqc();
	const recordOqcItem = useRecordOqcItem();
	const completeOqc = useCompleteOqc();

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

	const openRecordDialog = (oqcId: string, readOnlyMode: boolean) => {
		setSelectedOqcId(oqcId);
		setRecordReadOnly(readOnlyMode);
		setRecordDialogOpen(true);
	};

	const openCompleteDialog = (oqcId: string) => {
		setSelectedOqcId(oqcId);
		setCompleteDialogOpen(true);
	};

	const closeRecordDialog = (open: boolean) => {
		setRecordDialogOpen(open);
		if (!open) {
			setRecordReadOnly(false);
			setSelectedOqcId(null);
		}
	};

	const closeCompleteDialog = (open: boolean) => {
		setCompleteDialogOpen(open);
		if (!open) {
			setSelectedOqcId(null);
		}
	};

	const handleStartOqc = async (oqcId: string) => {
		await startOqc.mutateAsync(oqcId);
	};

	const handleRecordItem = async (values: OqcRecordFormValues) => {
		if (!selectedOqcId) return;
		await recordOqcItem.mutateAsync({ oqcId: selectedOqcId, data: values });
	};

	const handleCompleteOqc = async (values: OqcCompleteFormValues) => {
		if (!selectedOqcId) return;
		await completeOqc.mutateAsync({ oqcId: selectedOqcId, data: values });
	};

	const tableMeta: OqcTableMeta = {
		onStart: handleStartOqc,
		onRecord: (oqcId: string) => openRecordDialog(oqcId, false),
		onComplete: openCompleteDialog,
		onView: (oqcId: string) => openRecordDialog(oqcId, true),
	};

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={oqcColumns}
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
							<h1 className="text-2xl font-bold tracking-tight">出货检验 (OQC)</h1>
							<p className="text-muted-foreground">管理 OQC 抽检任务与检验记录。</p>
						</div>
						<Can permissions={Permission.QUALITY_OQC}>
							<Button variant="secondary" size="sm" onClick={() => void refetch()}>
								刷新列表
							</Button>
						</Can>
					</div>
				}
				queryPresetBarProps={{
					systemPresets: OQC_SYSTEM_PRESETS,
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
							key: "status",
							type: "multiSelect",
							label: "状态",
							options: STATUS_OPTIONS,
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
					renderCard: (item: OqcInspection) => (
						<OqcCard
							oqc={item}
							onStart={handleStartOqc}
							onRecord={(oqcId) => openRecordDialog(oqcId, false)}
							onComplete={openCompleteDialog}
							onView={(oqcId) => openRecordDialog(oqcId, true)}
						/>
					),
				}}
				tableMeta={tableMeta}
			/>

			<OqcRecordDialog
				open={recordDialogOpen}
				onOpenChange={closeRecordDialog}
				oqc={selectedOqcDetail ?? null}
				onSubmit={handleRecordItem}
				isSubmitting={recordOqcItem.isPending}
				readOnly={recordReadOnly}
			/>

			<OqcCompleteDialog
				open={completeDialogOpen}
				onOpenChange={closeCompleteDialog}
				oqc={selectedOqcDetail ?? null}
				onSubmit={handleCompleteOqc}
				isSubmitting={completeOqc.isPending}
			/>
		</div>
	);
}
