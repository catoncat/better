import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbility } from "@/hooks/use-ability";
import {
	type FqcInspection,
	useCompleteFqc,
	useCreateFqc,
	useFqcDetail,
	useFqcList,
	useRecordFqcItem,
	useSignFqc,
	useStartFqc,
} from "@/hooks/use-fqc";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { INSPECTION_STATUS_MAP } from "@/lib/constants";
import { FqcCard } from "../-components/fqc-card";
import { type FqcTableMeta, fqcColumns } from "../-components/fqc-columns";
import { FqcCompleteDialog, type FqcCompleteFormValues } from "../-components/fqc-complete-dialog";
import { FqcRecordDialog, type FqcRecordFormValues } from "../-components/fqc-record-dialog";
import { FqcSignDialog, type FqcSignFormValues } from "../-components/fqc-sign-dialog";

interface FqcFilters {
	runNo: string;
	status: string[];
}

const FQC_SYSTEM_PRESETS: SystemPreset<FqcFilters>[] = [
	{ id: "pending", name: "待开始", filters: { status: ["PENDING"] } },
	{ id: "inspecting", name: "检验中", filters: { status: ["INSPECTING"] } },
	{ id: "need-sign", name: "待签字", filters: { status: ["PASS"] } },
	{ id: "done", name: "已完成", filters: { status: ["PASS", "FAIL"] } },
];

const STATUS_OPTIONS = Object.entries(INSPECTION_STATUS_MAP).map(([value, label]) => ({
	label,
	value,
}));

interface FqcSearchParams {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/fqc/")({
	validateSearch: (search: Record<string, unknown>): FqcSearchParams => ({
		runNo: (search.runNo as string) || undefined,
		status: (search.status as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: FqcPage,
});

function FqcPage() {
	const viewPreferencesKey = "fqc";
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canViewFqc = hasPermission(Permission.QUALITY_FAI);

	const [selectedFqcId, setSelectedFqcId] = useState<string | null>(null);
	const [recordDialogOpen, setRecordDialogOpen] = useState(false);
	const [recordReadOnly, setRecordReadOnly] = useState(false);
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [signDialogOpen, setSignDialogOpen] = useState(false);

	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createRunNo, setCreateRunNo] = useState("");
	const [createSampleQty, setCreateSampleQty] = useState(1);

	const filters: FqcFilters = useMemo(
		() => ({
			runNo: searchParams.runNo || "",
			status: searchParams.status?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => filters.runNo !== "" || filters.status.length > 0, [filters]);

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
		(newFilters: Partial<FqcFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: FqcSearchParams = { ...prev, page: 1 };
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
	} = useQueryPresets<FqcFilters>({
		storageKey: "fqc",
		sortableArrayKeys: ["status"],
	});

	const allPresets = useMemo(() => [...FQC_SYSTEM_PRESETS, ...userPresets], [userPresets]);
	const currentActivePresetId = useMemo(
		() => matchPreset(filters, allPresets),
		[filters, allPresets, matchPreset],
	);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<FqcFilters>) => {
			const newFilters: Partial<FqcFilters> = {
				runNo: "",
				status: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, error, refetch } = useFqcList(
		{
			page: pageIndex + 1,
			pageSize,
			runNo: filters.runNo || undefined,
			status: filters.status.length > 0 ? filters.status.join(",") : undefined,
		},
		{ enabled: canViewFqc },
	);
	const { data: selectedFqcDetail } = useFqcDetail(selectedFqcId ?? undefined, {
		enabled: canViewFqc,
	});

	const createFqc = useCreateFqc();
	const startFqc = useStartFqc();
	const recordFqcItem = useRecordFqcItem();
	const completeFqc = useCompleteFqc();
	const signFqc = useSignFqc();

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

	const openRecordDialog = (fqcId: string, readOnlyMode: boolean) => {
		setSelectedFqcId(fqcId);
		setRecordReadOnly(readOnlyMode);
		setRecordDialogOpen(true);
	};

	const openCompleteDialog = (fqcId: string) => {
		setSelectedFqcId(fqcId);
		setCompleteDialogOpen(true);
	};

	const openSignDialog = (fqcId: string) => {
		setSelectedFqcId(fqcId);
		setSignDialogOpen(true);
	};

	const closeRecordDialog = (open: boolean) => {
		setRecordDialogOpen(open);
		if (!open) {
			setRecordReadOnly(false);
			setSelectedFqcId(null);
		}
	};

	const closeCompleteDialog = (open: boolean) => {
		setCompleteDialogOpen(open);
		if (!open) {
			setSelectedFqcId(null);
		}
	};

	const closeSignDialog = (open: boolean) => {
		setSignDialogOpen(open);
		if (!open) {
			setSelectedFqcId(null);
		}
	};

	const handleStartFqc = async (fqcId: string) => {
		await startFqc.mutateAsync(fqcId);
	};

	const handleRecordItem = async (values: FqcRecordFormValues) => {
		if (!selectedFqcId) return;
		await recordFqcItem.mutateAsync({ fqcId: selectedFqcId, data: values });
	};

	const handleCompleteFqc = async (values: FqcCompleteFormValues) => {
		if (!selectedFqcId) return;
		await completeFqc.mutateAsync({ fqcId: selectedFqcId, data: values });
	};

	const handleSignFqc = async (values: FqcSignFormValues) => {
		if (!selectedFqcId) return;
		await signFqc.mutateAsync({ fqcId: selectedFqcId, data: values });
	};

	const tableMeta: FqcTableMeta = {
		onStart: handleStartFqc,
		onRecord: (fqcId) => openRecordDialog(fqcId, false),
		onComplete: openCompleteDialog,
		onSign: openSignDialog,
		onView: (fqcId) => openRecordDialog(fqcId, true),
	};

	const header = (
		<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">末件检验 (FQC)</h1>
				<p className="text-muted-foreground">管理末件检验任务与检验记录。</p>
			</div>
			<div className="flex flex-wrap gap-2">
				<Can permissions={Permission.QUALITY_FAI}>
					<Button variant="secondary" size="sm" onClick={() => setCreateDialogOpen(true)}>
						创建末件检验
					</Button>
					<Button variant="secondary" size="sm" onClick={() => void refetch()}>
						刷新列表
					</Button>
				</Can>
			</div>
		</div>
	);

	if (!canViewFqc) {
		return (
			<div className="space-y-6">
				{header}
				<NoAccessCard description="需要首件检验权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={fqcColumns}
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
				header={header}
				queryPresetBarProps={{
					systemPresets: FQC_SYSTEM_PRESETS,
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
					renderCard: (item: FqcInspection) => (
						<FqcCard
							fqc={item}
							onStart={handleStartFqc}
							onRecord={(fqcId) => openRecordDialog(fqcId, false)}
							onComplete={openCompleteDialog}
							onSign={openSignDialog}
							onView={(fqcId) => openRecordDialog(fqcId, true)}
						/>
					),
				}}
				tableMeta={tableMeta}
			/>

			<FqcRecordDialog
				open={recordDialogOpen}
				onOpenChange={closeRecordDialog}
				fqc={selectedFqcDetail ?? null}
				onSubmit={handleRecordItem}
				isSubmitting={recordFqcItem.isPending}
				readOnly={recordReadOnly}
			/>

			<FqcCompleteDialog
				open={completeDialogOpen}
				onOpenChange={closeCompleteDialog}
				fqc={selectedFqcDetail ?? null}
				onSubmit={handleCompleteFqc}
				isSubmitting={completeFqc.isPending}
			/>

			<FqcSignDialog
				open={signDialogOpen}
				onOpenChange={closeSignDialog}
				fqc={selectedFqcDetail ?? null}
				onSubmit={handleSignFqc}
				isSubmitting={signFqc.isPending}
			/>

			<Dialog
				open={createDialogOpen}
				onOpenChange={(open) => {
					setCreateDialogOpen(open);
					if (!open) {
						setCreateRunNo("");
						setCreateSampleQty(1);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>创建末件检验</DialogTitle>
						<DialogDescription>
							为已完成生产（全部单元终态）的批次创建末件检验任务。
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="fqcRunNo">批次号</Label>
							<Input
								id="fqcRunNo"
								value={createRunNo}
								onChange={(event) => setCreateRunNo(event.target.value)}
								placeholder="例如: RUN-2026-0001"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fqcSampleQty">抽样数量（默认 1）</Label>
							<Input
								id="fqcSampleQty"
								type="number"
								min={1}
								value={createSampleQty}
								onChange={(event) =>
									setCreateSampleQty(Number.parseInt(event.target.value, 10) || 1)
								}
								placeholder="输入抽样数量"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
							取消
						</Button>
						<Button
							onClick={async () => {
								const runNo = createRunNo.trim();
								if (!runNo) return;
								await createFqc.mutateAsync({ runNo, sampleQty: createSampleQty });
								setCreateDialogOpen(false);
							}}
							disabled={!createRunNo.trim() || createSampleQty < 1 || createFqc.isPending}
						>
							{createFqc.isPending ? "正在创建..." : "创建"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
