import { Permission } from "@better-app/db/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { LineSelect } from "@/components/select/line-select";
import { Button } from "@/components/ui/button";
import { useAbility } from "@/hooks/use-ability";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { type Run, useAuthorizeRun, useRunList } from "@/hooks/use-runs";
import { client } from "@/lib/eden";
import { RunCard } from "../-components/run-card";
import { runColumns } from "../-components/run-columns";

interface RunFilters {
	search: string;
	status: string[];
	lineCode?: string;
}

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
		(newFilters: Partial<RunFilters>) => {
			const newSearch: RunSearchParams = {
				...searchParams,
				page: 1,
				woNo: searchParams.woNo,
				lineCode: searchParams.lineCode,
			};
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
				page: 1,
				pageSize: searchParams.pageSize,
				woNo: searchParams.woNo,
			},
			replace: true,
		});
	}, [navigate, searchParams.pageSize, searchParams.woNo]);

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

	// System presets
	const systemPresets = useMemo((): SystemPreset<RunFilters>[] => {
		return [
			{ id: "prep", name: "准备中批次", filters: { status: ["PREP", "FAI_PENDING"] } },
			{ id: "running", name: "生产中批次", filters: { status: ["AUTHORIZED", "RUNNING"] } },
			{ id: "archived", name: "已归档", filters: { status: ["ARCHIVED"] } },
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

	const { data, isLoading } = useRunList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		status: filters.status.length > 0 ? filters.status.join(",") : undefined,
		sort: searchParams.sort,
		woNo: searchParams.woNo,
		lineCode: filters.lineCode,
	});

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

	const initialSorting = useMemo(() => [{ id: "createdAt", desc: true }], []);

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: { ...searchParams, page: next.pageIndex + 1, pageSize: next.pageSize },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

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

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={runColumns}
			initialSorting={initialSorting}
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
			header={
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
						placeholder: "搜索批次号或工单号...",
					},
					{
						key: "status",
						type: "multiSelect",
						label: "状态",
						options: [
							{ label: "准备中", value: "PREP" },
							{ label: "待FAI", value: "FAI_PENDING" },
							{ label: "已授权", value: "AUTHORIZED" },
							{ label: "生产中", value: "RUNNING" },
							{ label: "收尾中", value: "FINISHING" },
							{ label: "已归档", value: "ARCHIVED" },
							{ label: "已取消", value: "CANCELLED" },
						],
					},
					{
						key: "lineCode",
						type: "custom",
						label: "线体",
						render: (value, onChange) => (
							<LineSelect
								value={(value as string) || ""}
								onValueChange={(nextValue) => onChange(nextValue || undefined)}
								placeholder="选择线体"
								className="w-[200px]"
							/>
						),
					},
				],
				filters,
				onFilterChange: setFilter,
				onFiltersChange: setFilters,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
				actions: (
					<Button
						variant="secondary"
						size="sm"
						disabled={!canBatchAuthorize || selectedRunNos.size === 0 || isBatchAuthorizing}
						onClick={handleBatchAuthorize}
					>
						批量授权
						{selectedRunNos.size > 0 ? ` (${selectedRunNos.size})` : ""}
					</Button>
				),
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
