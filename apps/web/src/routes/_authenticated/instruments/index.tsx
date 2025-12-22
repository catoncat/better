import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalibrationFormDialog } from "@/components/calibrations/calibration-form-dialog";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstrumentDepartments } from "@/hooks/use-instrument-departments";
import {
	type Instrument,
	useCreateInstrument,
	useInstrumentList,
	useUpdateInstrument,
} from "@/hooks/use-instruments";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { columns } from "./-components/columns";
import { InstrumentCard } from "./-components/instrument-card";
import {
	InstrumentDialog,
	type InstrumentFormValues,
} from "./-components/instrument-create-dialog";

interface InstrumentFilters {
	search: string;
	calibrationType: string[];
	department: string[];
}

interface InstrumentSearchParams {
	search?: string;
	calibrationType?: string;
	department?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/instruments/")({
	validateSearch: (search: Record<string, unknown>): InstrumentSearchParams => ({
		search: (search.search as string) || undefined,
		calibrationType: (search.calibrationType as string) || undefined,
		department: (search.department as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: InstrumentsListPage,
});

const calibrationTypeOptions = [
	{ label: "内校", value: "internal" },
	{ label: "外校", value: "external" },
];

function InstrumentsListPage() {
	const viewPreferencesKey = "instruments";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/instruments/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { data: departments } = useInstrumentDepartments();
	const { mutateAsync: createInstrument, isPending: isCreating } = useCreateInstrument();
	const { mutateAsync: updateInstrument, isPending: isUpdating } = useUpdateInstrument();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
	const [createCalibrationOpen, setCreateCalibrationOpen] = useState(false);
	const [createCalibrationInstrumentId, setCreateCalibrationInstrumentId] = useState<
		string | undefined
	>(undefined);

	const departmentOptions = useMemo(
		() => departments?.map((d: string) => ({ label: d, value: d })) || [],
		[departments],
	);

	// Parse filters from URL
	const filters: InstrumentFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			calibrationType: searchParams.calibrationType?.split(",").filter(Boolean) || [],
			department: searchParams.department?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" || filters.calibrationType.length > 0 || filters.department.length > 0
		);
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
		(newFilters: Partial<InstrumentFilters>) => {
			const newSearch: InstrumentSearchParams = { ...searchParams, page: 1 };
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
			search: { page: 1, pageSize: searchParams.pageSize },
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	// Pagination state (driven by URL via DataListLayout server mode)
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

	// Sync pagination state from URL (sorting/filtering resets page)
	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 30);
	}, [searchParams.page, searchParams.pageSize]);

	// Query presets
	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<InstrumentFilters>({ storageKey: "instruments" });

	// System presets
	const systemPresets = useMemo((): SystemPreset<InstrumentFilters>[] => {
		return [
			{ id: "all", name: "全部", filters: {} },
			{ id: "internal", name: "内校仪器", filters: { calibrationType: ["internal"] } },
			{ id: "external", name: "外校仪器", filters: { calibrationType: ["external"] } },
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
		(presetId: string, presetFilters: Partial<InstrumentFilters>) => {
			const newFilters: Partial<InstrumentFilters> = {
				search: "",
				calibrationType: [],
				department: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, isError, error } = useInstrumentList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		calibrationType: filters.calibrationType.length > 0 ? filters.calibrationType : undefined,
		department: filters.department.length > 0 ? filters.department : undefined,
		sort: searchParams.sort,
	});

	const initialSorting = useMemo(() => [{ id: "instrumentNo", desc: false }], []);
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

	const handleCreateCalibration = useCallback((instrumentId: string) => {
		setCreateCalibrationInstrumentId(instrumentId);
		setCreateCalibrationOpen(true);
	}, []);

	const handleOpenCreate = useCallback(() => {
		setEditingInstrument(null);
		setDialogOpen(true);
	}, []);

	const handleOpenEdit = useCallback((instrument: Instrument) => {
		setEditingInstrument(instrument);
		setDialogOpen(true);
	}, []);

	const handleSubmitInstrument = async (values: InstrumentFormValues) => {
		try {
			if (editingInstrument) {
				await updateInstrument({ id: editingInstrument.id, ...values });
			} else {
				await createInstrument(values);
			}
		} catch (err) {
			toast.error(editingInstrument ? "更新失败" : "创建失败", {
				description: err instanceof Error ? err.message : "请稍后重试",
			});
			throw err;
		}
	};

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
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
			initialPageSize={searchParams.pageSize || 30}
			locationSearch={locationSearch}
			tableMeta={{
				onEdit: handleOpenEdit,
				onViewCalibrations: (id: string) =>
					navigate({
						to: "/calibrations",
						search: { instrumentId: id },
					}),
				onCreateCalibration: handleCreateCalibration,
			}}
			columns={columns}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">仪器计量管理</h1>
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
						placeholder: "搜索编号、名称或型号...",
					},
					{
						key: "calibrationType",
						type: "multiSelect",
						label: "计量方式",
						options: calibrationTypeOptions,
					},
					{
						key: "department",
						type: "multiSelect",
						label: "部门",
						options: departmentOptions,
					},
				],
				filters,
				onFilterChange: setFilter,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey: viewPreferencesKey,
				actions: (
					<div className="flex items-center space-x-2">
						<Button size="sm" className="h-8" onClick={handleOpenCreate}>
							<Plus className="mr-2 h-4 w-4" />
							新增仪器
						</Button>
					</div>
				),
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item) => (
					<InstrumentCard instrument={item} onCreateCalibration={handleCreateCalibration} />
				),
			}}
			isLoading={isLoading}
			loadingFallback={
				<div className="space-y-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			}
			error={
				isError ? (
					<div className="text-center text-destructive p-4">加载数据出错: {error?.message}</div>
				) : undefined
			}
		>
			<InstrumentDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				instrument={editingInstrument}
				onSubmit={handleSubmitInstrument}
				isSubmitting={isCreating || isUpdating}
			/>
			<CalibrationFormDialog
				open={createCalibrationOpen}
				onOpenChange={(open) => {
					if (!open) setCreateCalibrationOpen(false);
					else setCreateCalibrationOpen(true);
				}}
				defaultInstrumentId={createCalibrationInstrumentId}
				onSubmitSuccess={() => {
					setCreateCalibrationOpen(false);
				}}
			/>
		</DataListLayout>
	);
}
