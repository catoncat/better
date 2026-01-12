import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import {
	type DataCollectionSpec,
	useDataCollectionSpecList,
	useUpdateDataCollectionSpec,
} from "@/hooks/use-data-collection-specs";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { DCSpecCard } from "./-components/card";
import { type DCSpecTableMeta, dcSpecColumns } from "./-components/columns";

interface DCSpecFilters {
	search: string;
	operationCode?: string;
	isActive?: "true" | "false";
}

interface DCSpecSearchParams {
	search?: string;
	operationCode?: string;
	isActive?: "true" | "false";
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/data-collection-specs/")({
	validateSearch: (search: Record<string, unknown>): DCSpecSearchParams => ({
		search: (search.search as string) || undefined,
		operationCode: (search.operationCode as string) || undefined,
		isActive: (search.isActive as "true" | "false") || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: DataCollectionSpecsPage,
});

function DataCollectionSpecsPage() {
	const viewPreferencesKey = "data-collection-specs";
	const navigate = useNavigate();
	const searchParams = useSearch({
		from: "/_authenticated/mes/data-collection-specs/",
	});
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { mutateAsync: updateSpec } = useUpdateDataCollectionSpec();

	// Dialog state (to be implemented in Slice 4)
	const [_editingSpec, setEditingSpec] = useState<DataCollectionSpec | null>(null);
	const [_isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// Parse filters from URL
	const filters: DCSpecFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			operationCode: searchParams.operationCode || undefined,
			isActive: searchParams.isActive || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || Boolean(filters.operationCode) || Boolean(filters.isActive);
	}, [filters]);

	// Update URL with new filters
	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized = value || undefined;
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
		(newFilters: Partial<DCSpecFilters>) => {
			const newSearch: DCSpecSearchParams = {
				...searchParams,
				page: 1,
			};
			for (const [key, value] of Object.entries(newFilters)) {
				(newSearch as Record<string, unknown>)[key] = value || undefined;
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
			},
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	// Pagination state
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

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
	} = useQueryPresets<DCSpecFilters>({
		storageKey: "data-collection-specs",
	});

	// System presets
	const systemPresets = useMemo((): SystemPreset<DCSpecFilters>[] => {
		return [
			{ id: "active", name: "启用中", filters: { isActive: "true" } },
			{ id: "inactive", name: "已停用", filters: { isActive: "false" } },
		];
	}, []);

	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);

	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<DCSpecFilters>) => {
			const newFilters: Partial<DCSpecFilters> = {
				search: "",
				operationCode: undefined,
				isActive: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	// Data query
	const { data, isLoading } = useDataCollectionSpecList({
		page: pageIndex + 1,
		pageSize,
		name: filters.search || undefined,
		operationCode: filters.operationCode,
		isActive: filters.isActive,
		sortBy: searchParams.sort?.split(".")[0] as "updatedAt" | "name" | "createdAt" | undefined,
		sortDir: searchParams.sort?.split(".")[1] as "asc" | "desc" | undefined,
	});

	const initialSorting = useMemo(() => [{ id: "updatedAt", desc: true }], []);

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: {
					...searchParams,
					page: next.pageIndex + 1,
					pageSize: next.pageSize,
				},
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

	// Action handlers
	const handleEdit = useCallback((spec: DataCollectionSpec) => {
		setEditingSpec(spec);
		// TODO: Open dialog in Slice 4
		toast.info(`编辑: ${spec.name} (对话框待实现)`);
	}, []);

	const handleToggleActive = useCallback(
		async (spec: DataCollectionSpec) => {
			try {
				await updateSpec({
					specId: spec.id,
					isActive: !spec.isActive,
				});
			} catch {
				// Error already handled by mutation
			}
		},
		[updateSpec],
	);

	const handleCreate = useCallback(() => {
		setIsCreateDialogOpen(true);
		// TODO: Open dialog in Slice 4
		toast.info("新建采集项 (对话框待实现)");
	}, []);

	const tableMeta: DCSpecTableMeta = {
		onEdit: handleEdit,
		onToggleActive: handleToggleActive,
	};

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={dcSpecColumns}
			initialSorting={initialSorting}
			onSortingChange={handleSortingChange}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
			locationSearch={locationSearch}
			isLoading={isLoading}
			tableMeta={tableMeta}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">采集项管理</h1>
						<p className="text-muted-foreground">配置生产过程中的数据采集规格</p>
					</div>
					<Can permissions={Permission.DATA_SPEC_CONFIG}>
						<Button onClick={handleCreate}>
							<Plus className="mr-2 h-4 w-4" />
							新建采集项
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
						placeholder: "搜索采集项名称...",
					},
					{
						key: "isActive",
						type: "select",
						label: "状态",
						options: [
							{ label: "启用", value: "true" },
							{ label: "停用", value: "false" },
						],
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
				renderCard: (item: DataCollectionSpec) => (
					<DCSpecCard spec={item} onEdit={handleEdit} onToggleActive={handleToggleActive} />
				),
			}}
		/>
	);
}
