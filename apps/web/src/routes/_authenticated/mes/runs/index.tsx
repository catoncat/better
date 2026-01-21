import { Permission } from "@better-app/db/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import {
	DataListLayout,
	type FilterFieldDefinition,
	type SystemPreset,
} from "@/components/data-list";
import { LineSelect } from "@/components/select/line-select";
import { Button } from "@/components/ui/button";
import { useAbility } from "@/hooks/use-ability";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { type Run, useAuthorizeRun, useRunList } from "@/hooks/use-runs";
import { RUN_STATUS_MAP } from "@/lib/constants";
import { client } from "@/lib/eden";
import { RunCard } from "../-components/run-card";
import { getRunColumns } from "../-components/run-columns";

interface RunFilters {
	search: string;
	status: string[];
	lineCode?: string;
}

// 静态系统预设 - 提升到模块级别避免不必要的重新创建
const RUN_SYSTEM_PRESETS: SystemPreset<RunFilters>[] = [
	{ id: "prep", name: "准备中批次", filters: { status: ["PREP"] } },
	{ id: "running", name: "执行中批次", filters: { status: ["AUTHORIZED", "IN_PROGRESS"] } },
	{ id: "on-hold", name: "隔离批次", filters: { status: ["ON_HOLD"] } },
	{
		id: "terminal",
		name: "终态批次",
		filters: { status: ["COMPLETED", "CLOSED_REWORK", "SCRAPPED"] },
	},
];

// 静态初始排序
const INITIAL_SORTING = [{ id: "createdAt", desc: true }];

interface RunSearchParams {
	search?: string;
	status?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
	woNo?: string;
	lineCode?: string;
}

export const Route = createFileRoute("/_authenticated/mes/runs/")({
	validateSearch: (search: Record<string, unknown>): RunSearchParams => ({
		search: (search.search as string) || undefined,
		status: (search.status as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
		woNo: (search.woNo as string) || undefined,
		lineCode: (search.lineCode as string) || undefined,
	}),
	component: RunsPage,
});

function RunsPage() {
	const viewPreferencesKey = "runs";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/runs/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { mutateAsync: authorizeRun } = useAuthorizeRun();
	const queryClient = useQueryClient();
	const { hasPermission } = useAbility();
	const [isBatchAuthorizing, setIsBatchAuthorizing] = useState(false);
	const canViewRuns = hasPermission(Permission.RUN_READ);
	const canViewLines = hasPermission(Permission.RUN_READ) && hasPermission(Permission.RUN_CREATE);
	const canBatchAuthorize = hasPermission(Permission.RUN_AUTHORIZE);

	// Parse filters from URL
	const filters: RunFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			status: searchParams.status?.split(",").filter(Boolean) || [],
			lineCode: searchParams.lineCode || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || filters.status.length > 0 || Boolean(filters.lineCode);
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
		(newFilters: Partial<RunFilters>) => {
			navigate({
				to: ".",
				search: (prev) => {
					const nextSearch: RunSearchParams = {
						...prev,
						page: 1,
						woNo: prev.woNo,
						lineCode: prev.lineCode,
					};
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
				woNo: prev.woNo,
			}),
			replace: true,
		});
	}, [navigate]);

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
	} = useQueryPresets<RunFilters>({
		storageKey: "runs",
		sortableArrayKeys: ["status"],
	});

	// All presets for matching - 使用模块级常量
	const allPresets = useMemo(() => [...RUN_SYSTEM_PRESETS, ...userPresets], [userPresets]);

	// Find active preset based on current filters
	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	// Handle preset apply
	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<RunFilters>) => {
			const newFilters: Partial<RunFilters> = {
				search: "",
				status: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading } = useRunList(
		{
			page: pageIndex + 1,
			pageSize,
			search: filters.search || undefined,
			status: filters.status.length > 0 ? filters.status.join(",") : undefined,
			sort: searchParams.sort,
			woNo: searchParams.woNo,
			lineCode: filters.lineCode,
		},
		{ enabled: canViewRuns },
	);

	const filterFields = useMemo(() => {
		const fields: FilterFieldDefinition[] = [
			{
				key: "search",
				type: "search",
				placeholder: "搜索批次号或工单号...",
			},
			{
				key: "status",
				type: "multiSelect",
				label: "状态",
				options: Object.entries(RUN_STATUS_MAP).map(([value, label]) => ({
					label,
					value,
				})),
			},
		];

		if (canViewLines) {
			fields.push({
				key: "lineCode",
				type: "custom",
				label: "线体",
				render: (value, onChange) => (
					<LineSelect
						value={(value as string) || ""}
						onValueChange={(nextValue) => onChange(nextValue || undefined)}
						placeholder="选择线体"
						className="w-[200px]"
						enabled={canViewLines}
					/>
				),
			});
		}

		return fields;
	}, [canViewLines]);

	const [selectedRunNos, setSelectedRunNos] = useState<Set<string>>(new Set());
	const visibleRunNos = useMemo(
		() => (data?.items ?? []).map((item: Run) => item.runNo),
		[data?.items],
	);

	useEffect(() => {
		setSelectedRunNos((prev) => {
			const next = new Set<string>();
			for (const runNo of prev) {
				if (visibleRunNos.includes(runNo)) {
					next.add(runNo);
				}
			}
			return next;
		});
	}, [visibleRunNos]);

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

	const handleSortingChange = useCallback(
		(nextSorting: { id: string; desc: boolean }[]) => {
			const serialized =
				nextSorting.length > 0
					? nextSorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(",")
					: undefined;
			navigate({
				to: ".",
				search: (prev) => ({ ...prev, sort: serialized, page: 1 }),
				replace: true,
			});
		},
		[navigate],
	);

	const handleAuthorize = async (runNo: string) => {
		await authorizeRun({ runNo, action: "AUTHORIZE" });
	};

	const handleRevoke = async (runNo: string) => {
		await authorizeRun({ runNo, action: "REVOKE" });
	};

	const isRunSelected = useCallback((runNo: string) => selectedRunNos.has(runNo), [selectedRunNos]);

	const handleSelectRun = useCallback((runNo: string, selected: boolean) => {
		setSelectedRunNos((prev) => {
			const next = new Set(prev);
			if (selected) {
				next.add(runNo);
			} else {
				next.delete(runNo);
			}
			return next;
		});
	}, []);

	const handleSelectAll = useCallback((runNos: string[], selected: boolean) => {
		setSelectedRunNos((prev) => {
			const next = new Set(prev);
			for (const runNo of runNos) {
				if (selected) {
					next.add(runNo);
				} else {
					next.delete(runNo);
				}
			}
			return next;
		});
	}, []);

	const handleBatchAuthorize = useCallback(async () => {
		if (selectedRunNos.size === 0 || isBatchAuthorizing) return;
		setIsBatchAuthorizing(true);
		const runNos = Array.from(selectedRunNos);
		try {
			const results = await Promise.allSettled(
				runNos.map(async (runNo) => {
					const { error } = await client.api.runs({ runNo }).authorize.post({
						action: "AUTHORIZE",
					});
					if (error) {
						throw new Error(error.value ? JSON.stringify(error.value) : "授权失败");
					}
					return runNo;
				}),
			);

			const successCount = results.filter((result) => result.status === "fulfilled").length;
			const failureCount = results.filter((result) => result.status === "rejected").length;

			if (successCount > 0) {
				toast.success(`已授权 ${successCount} 个批次`);
			}
			if (failureCount > 0) {
				toast.error(`授权失败 ${failureCount} 个批次`);
			}
			if (successCount > 0) {
				queryClient.invalidateQueries({ queryKey: ["mes", "runs"] });
			}
			setSelectedRunNos(new Set());
		} finally {
			setIsBatchAuthorizing(false);
		}
	}, [isBatchAuthorizing, queryClient, selectedRunNos]);

	const columns = useMemo(() => getRunColumns(canBatchAuthorize), [canBatchAuthorize]);

	const header = (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">批次管理</h1>
				<p className="text-muted-foreground">创建生产批次并进行授权</p>
			</div>
			<Can permissions={Permission.RUN_CREATE}>
				<Button
					onClick={() => {
						navigate({ to: "/mes/work-orders" });
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					创建批次
				</Button>
			</Can>
		</div>
	);

	if (!canViewRuns) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要批次查看权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={columns}
			initialSorting={INITIAL_SORTING}
			onSortingChange={handleSortingChange}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
			locationSearch={locationSearch}
			isLoading={isLoading}
			tableMeta={{
				onAuthorize: handleAuthorize,
				onRevoke: handleRevoke,
				isRunSelected,
				onSelectRun: handleSelectRun,
				onSelectAll: handleSelectAll,
			}}
			header={header}
			queryPresetBarProps={{
				systemPresets: RUN_SYSTEM_PRESETS,
				userPresets,
				matchedPresetId: currentActivePresetId,
				onApplyPreset: handleApplyPreset,
				onSavePreset: (name) => savePreset(name, filters),
				onDeletePreset: deletePreset,
				onRenamePreset: renamePreset,
			}}
			filterToolbarProps={{
				fields: filterFields,
				filters,
				onFilterChange: setFilter,
				onFiltersChange: setFilters,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
				actions: canBatchAuthorize ? (
					<Button
						variant="secondary"
						size="sm"
						disabled={selectedRunNos.size === 0 || isBatchAuthorizing}
						onClick={handleBatchAuthorize}
					>
						批量授权
						{selectedRunNos.size > 0 ? ` (${selectedRunNos.size})` : ""}
					</Button>
				) : null,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item: Run) => (
					<RunCard run={item} onAuthorize={handleAuthorize} onRevoke={handleRevoke} />
				),
			}}
		/>
	);
}
