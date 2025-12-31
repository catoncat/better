import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalibrationFormDialog } from "@/components/calibrations/calibration-form-dialog";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type CalibrationAllSuccess, useAllCalibrationRecords } from "@/hooks/use-calibrations";
import { type Instrument, useInstrumentList } from "@/hooks/use-instruments";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { CalibrationCard } from "./-components/calibration-card";

interface CalibrationFilters {
	search: string;
	calibrationType: string;
	result: string;
	instrumentId: string[];
	dateFrom: string;
	dateTo: string;
}

interface CalibrationSearchParams {
	search?: string;
	calibrationType?: string;
	result?: string;
	dateFrom?: string;
	dateTo?: string;
	instrumentId?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

const calibrationTypeOptions = [
	{ label: "内校", value: "internal" },
	{ label: "外校", value: "external" },
];

const resultOptions = [
	{ label: "合格", value: "pass" },
	{ label: "不合格", value: "fail" },
	{ label: "待确认", value: "pending" },
];

type CalibrationRecordItem = CalibrationAllSuccess["items"][number] & {
	instrument: {
		id: string;
		instrumentNo: string;
		model?: string | null;
		manufacturer?: string | null;
		serialNo?: string | null;
		department?: string | null;
	};
};

const columns: ColumnDef<CalibrationRecordItem>[] = [
	{
		accessorKey: "performedAt",
		header: "校准日期",
		cell: ({ row }) => format(new Date(row.original.performedAt), "yyyy-MM-dd"),
	},
	{
		id: "instrument",
		accessorFn: (row) => row.instrument?.instrumentNo ?? "",
		header: "仪器信息",
		cell: ({ row }) => {
			const instrument = row.original.instrument;
			return (
				<div className="space-y-1">
					<div className="font-medium">{instrument?.instrumentNo ?? "未标注编号"}</div>
					<div className="text-xs text-muted-foreground">
						{[instrument?.model, instrument?.manufacturer].filter(Boolean).join(" · ") || "—"}
					</div>
					{instrument?.department ? (
						<div className="text-[11px] text-muted-foreground">{instrument.department}</div>
					) : null}
				</div>
			);
		},
	},
	{
		accessorKey: "calibrationType",
		header: "方式",
		cell: ({ row }) => (
			<Badge variant={row.original.calibrationType === "external" ? "default" : "secondary"}>
				{row.original.calibrationType === "external" ? "外校" : "内校"}
			</Badge>
		),
	},
	{
		accessorKey: "result",
		header: "结果",
		cell: ({ row }) => {
			const result = row.original.result;
			if (!result) return <Badge variant="outline">待确认</Badge>;
			if (result === "pass") return <Badge variant="default">合格</Badge>;
			if (result === "fail") return <Badge variant="destructive">不合格</Badge>;
			return <Badge variant="secondary">待确认</Badge>;
		},
	},
	{
		id: "certificate",
		accessorFn: (row) => row.certificateNo ?? "",
		header: "证书 / 机构",
		cell: ({ row }) => (
			<div className="space-y-1 text-sm">
				<div className="font-medium">{row.original.certificateNo ?? "—"}</div>
				<div className="text-xs text-muted-foreground">
					{row.original.providerName ?? "未填写机构/执行人"}
				</div>
			</div>
		),
	},
	{
		accessorKey: "nextCalibrationDate",
		header: "下次校准",
		cell: ({ row }) =>
			row.original.nextCalibrationDate
				? format(new Date(row.original.nextCalibrationDate), "yyyy-MM-dd")
				: "—",
	},
	{
		id: "actions",
		header: "操作",
		cell: ({ row, table }) => {
			const meta = table.options.meta as
				| { onViewInstrument?: (instrumentId: string) => void }
				| undefined;
			return (
				<Button
					variant="link"
					size="sm"
					onClick={() => meta?.onViewInstrument?.(row.original.instrumentId)}
				>
					查看仪器
				</Button>
			);
		},
	},
];

export const Route = createFileRoute("/_authenticated/calibrations/")({
	validateSearch: (search: Record<string, unknown>): CalibrationSearchParams => ({
		search: (search.search as string) || undefined,
		calibrationType: (search.calibrationType as string) || undefined,
		result: (search.result as string) || undefined,
		dateFrom: (search.dateFrom as string) || undefined,
		dateTo: (search.dateTo as string) || undefined,
		instrumentId: (search.instrumentId as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 20,
	}),
	component: CalibrationRecordsPage,
});

function CalibrationRecordsPage() {
	const viewPreferencesKey = "calibrations";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/calibrations/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { data: instrumentsData } = useInstrumentList({ page: 1, pageSize: 100 });

	const instrumentOptions = useMemo(
		() =>
			instrumentsData?.items?.map((instrument: Instrument) => ({
				value: instrument.id,
				label: instrument.description
					? `${instrument.description} (${instrument.instrumentNo})`
					: instrument.instrumentNo,
			})) || [],
		[instrumentsData?.items],
	);

	// Parse filters from URL
	const filters: CalibrationFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			calibrationType: searchParams.calibrationType || "",
			result: searchParams.result || "",
			instrumentId: searchParams.instrumentId?.split(",").filter(Boolean) || [],
			dateFrom: searchParams.dateFrom || "",
			dateTo: searchParams.dateTo || "",
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" ||
			filters.calibrationType !== "" ||
			filters.result !== "" ||
			filters.instrumentId.length > 0 ||
			filters.dateFrom !== "" ||
			filters.dateTo !== ""
		);
	}, [filters]);

	// Update URL with new filters
	const setFilter = useCallback(
		(key: string, value: unknown) => {
			// Handle date range specially
			if (key === "__dateRange__") {
				const { fromKey, toKey, from, to } = value as {
					fromKey: string;
					toKey: string;
					from: string;
					to: string;
				};
				navigate({
					to: ".",
					search: {
						...searchParams,
						[fromKey]: from || undefined,
						[toKey]: to || undefined,
						page: 1,
					},
					replace: true,
				});
				return;
			}

			const serialized = Array.isArray(value)
				? value.length > 0
					? value.join(",")
					: undefined
				: value || undefined;

			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: serialized,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(newFilters: Partial<CalibrationFilters>) => {
			const newSearch: CalibrationSearchParams = { ...searchParams, page: 1 };
			for (const [key, value] of Object.entries(newFilters)) {
				if (Array.isArray(value)) {
					(newSearch as Record<string, unknown>)[key] =
						value.length > 0 ? value.join(",") : undefined;
				} else {
					(newSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: newSearch,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: {
				instrumentId: searchParams.instrumentId,
				page: 1,
				pageSize: searchParams.pageSize,
			},
			replace: true,
		});
	}, [navigate, searchParams.instrumentId, searchParams.pageSize]);

	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 20);

	// Sync pagination state from URL (sorting/filtering resets page)
	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 20);
	}, [searchParams.page, searchParams.pageSize]);

	// Dialog state
	const [createOpen, setCreateOpen] = useState(false);

	// Query presets
	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<CalibrationFilters>({ storageKey: "calibrations" });

	// System presets
	const systemPresets = useMemo((): SystemPreset<CalibrationFilters>[] => {
		return [
			{ id: "internal", name: "内校", filters: { calibrationType: "internal" } },
			{ id: "external", name: "外校", filters: { calibrationType: "external" } },
			{ id: "pass", name: "合格", filters: { result: "pass" } },
			{ id: "fail", name: "不合格", filters: { result: "fail" } },
		];
	}, []);

	// All presets for matching
	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);

	// Find active preset based on current filters
	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	// Handle preset apply
	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<CalibrationFilters>) => {
			const newFilters: Partial<CalibrationFilters> = {
				search: "",
				calibrationType: "",
				result: "",
				instrumentId: [],
				dateFrom: "",
				dateTo: "",
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const handleOpenCreate = () => {
		setCreateOpen(true);
	};

	const handleCloseCreate = () => {
		setCreateOpen(false);
	};

	const instrumentIdSerialized =
		filters.instrumentId.length > 0 ? filters.instrumentId.join(",") : undefined;

	const { data, isLoading, isError, error } = useAllCalibrationRecords({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		calibrationType: filters.calibrationType || undefined,
		result: filters.result || undefined,
		dateFrom: filters.dateFrom || undefined,
		dateTo: filters.dateTo || undefined,
		instrumentId: instrumentIdSerialized,
		sort: searchParams.sort,
	});

	const initialSorting = useMemo(() => [{ id: "performedAt", desc: true }], []);
	const handleSortingChange = useCallback(
		(nextSorting: { id: string; desc: boolean }[]) => {
			const serialized =
				nextSorting.length > 0
					? nextSorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(",")
					: undefined;
			navigate({
				to: ".",
				search: { ...searchParams, sort: serialized, page: 1 },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	return (
		<DataListLayout
			mode="server"
			data={(data?.items as CalibrationRecordItem[]) || []}
			initialSorting={initialSorting}
			onSortingChange={handleSortingChange}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={(next) => {
				setPageIndex(next.pageIndex);
				setPageSize(next.pageSize);
				navigate({
					to: ".",
					search: { ...searchParams, page: next.pageIndex + 1, pageSize: next.pageSize },
					replace: true,
				});
			}}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 20}
			locationSearch={locationSearch}
			tableMeta={{
				onViewInstrument: (id: string) =>
					navigate({
						to: ".",
						search: { ...searchParams, instrumentId: id },
						replace: true,
					}),
			}}
			columns={columns}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold tracking-tight">校准记录</h1>
						<p className="text-sm text-muted-foreground">
							统一查看所有仪器的计量记录，支持按仪器编号查询和快速新增。
						</p>
					</div>
				</div>
			}
			queryPresetBarProps={{
				systemPresets,
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
						key: "search",
						type: "search",
						placeholder: "搜索仪器编号、型号、证书号...",
					},
					{
						key: "instrumentId",
						type: "multiSelect",
						label: "仪器",
						options: instrumentOptions,
					},
					{
						key: "calibrationType",
						type: "select",
						label: "计量方式",
						options: calibrationTypeOptions,
					},
					{
						key: "result",
						type: "select",
						label: "结果",
						options: resultOptions,
					},
					{
						key: "dateRange",
						type: "dateRange",
						dateFromKey: "dateFrom",
						dateToKey: "dateTo",
					},
				],
				filters,
				onFilterChange: setFilter,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey: viewPreferencesKey,
				actions: (
					<Button size="sm" className="h-8" onClick={handleOpenCreate}>
						<Plus className="mr-2 h-4 w-4" />
						新增记录
					</Button>
				),
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item) => <CalibrationCard record={item} />,
			}}
			isLoading={isLoading}
			loadingFallback={
				<div className="space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			}
			error={
				isError ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						{error instanceof Error ? error.message : "加载校准记录失败"}
					</div>
				) : undefined
			}
			afterList={<div className="text-sm text-muted-foreground">共 {data?.total ?? 0} 条记录</div>}
		>
			<CalibrationFormDialog
				open={createOpen}
				onOpenChange={(open) => {
					if (!open) handleCloseCreate();
					else handleOpenCreate();
				}}
				defaultInstrumentId={searchParams.instrumentId}
				onSubmitSuccess={(newInstrumentId) => {
					setPageIndex(0);
					if (newInstrumentId) {
						navigate({
							to: ".",
							search: { ...searchParams, instrumentId: newInstrumentId },
							replace: true,
						});
					}
					handleCloseCreate();
				}}
			/>
		</DataListLayout>
	);
}
