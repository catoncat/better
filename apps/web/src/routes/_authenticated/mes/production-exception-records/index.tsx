import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type ProductionExceptionRecord,
	useConfirmProductionExceptionRecord,
	useCreateProductionExceptionRecord,
	useProductionExceptionRecordList,
} from "@/hooks/use-production-exception-records";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	ProductionExceptionConfirmDialog,
	type ProductionExceptionConfirmFormValues,
} from "@/routes/_authenticated/mes/production-exception-records/-components/production-exception-confirm-dialog";
import {
	ProductionExceptionDialog,
	type ProductionExceptionFormValues,
} from "@/routes/_authenticated/mes/production-exception-records/-components/production-exception-dialog";
import { ProductionExceptionCard } from "./-components/production-exception-card";
import {
	type ProductionExceptionTableMeta,
	productionExceptionColumns,
} from "./-components/production-exception-columns";

interface ProductionExceptionFilters {
	lineCode: string;
	jobNo: string;
	customer: string;
	issuedFrom?: string;
	issuedTo?: string;
}

const PRODUCTION_EXCEPTION_SYSTEM_PRESETS: SystemPreset<ProductionExceptionFilters>[] = [];

interface ProductionExceptionSearchParams {
	lineCode?: string;
	jobNo?: string;
	customer?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/production-exception-records/")({
	validateSearch: (search: Record<string, unknown>): ProductionExceptionSearchParams => ({
		lineCode: (search.lineCode as string) || undefined,
		jobNo: (search.jobNo as string) || undefined,
		customer: (search.customer as string) || undefined,
		issuedFrom: (search.issuedFrom as string) || undefined,
		issuedTo: (search.issuedTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: ProductionExceptionPage,
});

function ProductionExceptionPage() {
	const viewPreferencesKey = "production-exception-records";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [dialogOpen, setDialogOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmTarget, setConfirmTarget] = useState<ProductionExceptionRecord | null>(null);
	const createRecord = useCreateProductionExceptionRecord();
	const confirmRecord = useConfirmProductionExceptionRecord();

	const filters: ProductionExceptionFilters = useMemo(
		() => ({
			lineCode: searchParams.lineCode || "",
			jobNo: searchParams.jobNo || "",
			customer: searchParams.customer || "",
			issuedFrom: searchParams.issuedFrom || undefined,
			issuedTo: searchParams.issuedTo || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.lineCode !== "" ||
			filters.jobNo !== "" ||
			filters.customer !== "" ||
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
		(newFilters: Partial<ProductionExceptionFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: ProductionExceptionSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<ProductionExceptionFilters>({
		storageKey: "production-exception-records",
	});

	const allPresets = useMemo(
		() => [...PRODUCTION_EXCEPTION_SYSTEM_PRESETS, ...userPresets],
		[userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<ProductionExceptionFilters>) => {
			const newFilters: Partial<ProductionExceptionFilters> = {
				lineCode: "",
				jobNo: "",
				customer: "",
				issuedFrom: undefined,
				issuedTo: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useProductionExceptionRecordList({
		page: pageIndex + 1,
		pageSize,
		lineCode: filters.lineCode || undefined,
		jobNo: filters.jobNo || undefined,
		customer: filters.customer || undefined,
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

	const handleCreate = async (values: ProductionExceptionFormValues) => {
		await createRecord.mutateAsync(values);
	};

	const handleConfirm = async (values: ProductionExceptionConfirmFormValues) => {
		if (!confirmTarget) return;
		await confirmRecord.mutateAsync({ id: confirmTarget.id, data: values });
		setConfirmOpen(false);
		setConfirmTarget(null);
	};

	const openConfirmDialog = useCallback((record: ProductionExceptionRecord) => {
		setConfirmTarget(record);
		setConfirmOpen(true);
	}, []);

	const tableMeta: ProductionExceptionTableMeta = useMemo(
		() => ({
			onConfirm: openConfirmDialog,
		}),
		[openConfirmDialog],
	);

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={productionExceptionColumns}
				pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
				onPaginationChange={handlePaginationChange}
				initialPageIndex={(searchParams.page || 1) - 1}
				initialPageSize={searchParams.pageSize || 30}
				locationSearch={locationSearch}
				tableMeta={tableMeta}
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
							<h1 className="text-2xl font-bold tracking-tight">生产异常记录</h1>
							<p className="text-muted-foreground">记录生产异常影响、停机与处理措施。</p>
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
					systemPresets: PRODUCTION_EXCEPTION_SYSTEM_PRESETS,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					fields: [
						{ key: "jobNo", type: "search", placeholder: "搜索工单号..." },
						{ key: "lineCode", type: "search", placeholder: "搜索产线..." },
						{ key: "customer", type: "search", placeholder: "搜索客户..." },
						{
							key: "issuedAt",
							type: "dateRange",
							label: "发生时间",
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
					renderCard: (record: ProductionExceptionRecord) => (
						<ProductionExceptionCard record={record} onConfirm={openConfirmDialog} />
					),
				}}
			/>

			<ProductionExceptionDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSubmit={handleCreate}
				isSubmitting={createRecord.isPending}
			/>
			<ProductionExceptionConfirmDialog
				open={confirmOpen}
				onOpenChange={(open) => {
					setConfirmOpen(open);
					if (!open) setConfirmTarget(null);
				}}
				record={confirmTarget}
				onSubmit={handleConfirm}
				isSubmitting={confirmRecord.isPending}
			/>
		</div>
	);
}
