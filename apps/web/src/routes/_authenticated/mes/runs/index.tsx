import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { useAuthorizeRun, useRunList } from "@/hooks/use-runs";
import { runColumns } from "../-components/run-columns";
import { RunCard } from "../-components/run-card";

interface RunFilters {
	search: string;
	status: string[];
}

interface RunSearchParams {
	search?: string;
	status?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
	woNo?: string;
}

export const Route = createFileRoute("/_authenticated/mes/runs/")({
	validateSearch: (search: Record<string, unknown>): RunSearchParams => ({
		search: (search.search as string) || undefined,
		status: (search.status as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
		woNo: (search.woNo as string) || undefined,
	}),
	component: RunsPage,
});

function RunsPage() {
	const viewPreferencesKey = "runs";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/runs/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { mutateAsync: authorizeRun } = useAuthorizeRun();

	// Parse filters from URL
	const filters: RunFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			status: searchParams.status?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || filters.status.length > 0;
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
			const newSearch: RunSearchParams = { ...searchParams, page: 1, woNo: searchParams.woNo };
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
			search: { page: 1, pageSize: searchParams.pageSize, woNo: searchParams.woNo },
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
	} = useQueryPresets<RunFilters>({ storageKey: "runs" });

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
	});

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
			}}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">批次管理</h1>
						<p className="text-muted-foreground">创建生产批次并进行授权</p>
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
				],
				filters,
				onFilterChange: setFilter,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item) => <RunCard run={item as any} onAuthorize={handleAuthorize} onRevoke={handleRevoke} />,
			}}
		/>
	);
}
