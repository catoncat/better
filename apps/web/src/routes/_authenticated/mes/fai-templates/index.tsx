import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useAbility } from "@/hooks/use-ability";
import {
	type FaiTemplateSummary,
	useFaiTemplateDetail,
	useFaiTemplateList,
	useUpdateFaiTemplate,
} from "@/hooks/use-fai-templates";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { PROCESS_TYPE_MAP } from "@/lib/constants";
import { FaiTemplateCard } from "./-components/card";
import { faiTemplateColumns, type FaiTemplateTableMeta } from "./-components/columns";
import { TemplateDialog } from "./-components/template-dialog";

interface FaiTemplateFilters {
	search: string;
	processType?: "SMT" | "DIP";
	isActive?: "true" | "false";
}

interface FaiTemplateSearchParams {
	search?: string;
	processType?: "SMT" | "DIP";
	isActive?: "true" | "false";
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/fai-templates/")({
	validateSearch: (search: Record<string, unknown>): FaiTemplateSearchParams => ({
		search: (search.search as string) || undefined,
		processType: (search.processType as "SMT" | "DIP") || undefined,
		isActive: (search.isActive as "true" | "false") || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: FaiTemplateListPage,
});

function FaiTemplateListPage() {
	const viewPreferencesKey = "fai-templates";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/fai-templates/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canViewTemplates = hasPermission(Permission.QUALITY_FAI);

	const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const { data: editingTemplate, isLoading: isTemplateLoading } = useFaiTemplateDetail(
		editingTemplateId ?? undefined,
		{ enabled: Boolean(editingTemplateId) && dialogOpen },
	);

	const updateTemplate = useUpdateFaiTemplate();

	const filters: FaiTemplateFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			processType: searchParams.processType || undefined,
			isActive: searchParams.isActive || undefined,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || Boolean(filters.processType) || Boolean(filters.isActive);
	}, [filters]);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: value || undefined,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(newFilters: Partial<FaiTemplateFilters>) => {
			const newSearch: FaiTemplateSearchParams = {
				...searchParams,
				page: 1,
			};
			for (const [key, value] of Object.entries(newFilters)) {
				(newSearch as Record<string, unknown>)[key] = value || undefined;
			}
			navigate({ to: ".", search: newSearch, replace: true });
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
	} = useQueryPresets<FaiTemplateFilters>({ storageKey: "fai-templates" });

	const systemPresets = useMemo((): SystemPreset<FaiTemplateFilters>[] => {
		return [
			{ id: "active", name: "启用中", filters: { isActive: "true" } },
			{ id: "inactive", name: "已停用", filters: { isActive: "false" } },
			{ id: "smt", name: "SMT", filters: { processType: "SMT" } },
			{ id: "dip", name: "DIP", filters: { processType: "DIP" } },
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
		(presetId: string, presetFilters: Partial<FaiTemplateFilters>) => {
			const newFilters: Partial<FaiTemplateFilters> = {
				search: "",
				processType: undefined,
				isActive: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading } = useFaiTemplateList(
		{
			page: pageIndex + 1,
			pageSize,
			search: filters.search || undefined,
			processType: filters.processType,
			isActive: filters.isActive,
		},
		{ enabled: canViewTemplates },
	);

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

	const handleCreate = () => {
		setEditingTemplateId(null);
		setDialogOpen(true);
	};

	const handleEdit = (template: FaiTemplateSummary) => {
		setEditingTemplateId(template.id);
		setDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setEditingTemplateId(null);
		}
	};

	const handleToggleActive = async (template: FaiTemplateSummary) => {
		await updateTemplate.mutateAsync({
			templateId: template.id,
			isActive: !template.isActive,
		});
	};

	const tableMeta: FaiTemplateTableMeta = {
		onEdit: handleEdit,
		onToggleActive: handleToggleActive,
	};

	const processTypeOptions = useMemo(
		() =>
			Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => ({
				value,
				label,
			})),
		[],
	);

	const header = (
		<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">FAI 模板</h1>
				<p className="text-muted-foreground">管理首件检验模板与检验项配置。</p>
			</div>
			<Can permissions={Permission.QUALITY_FAI}>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 h-4 w-4" />
					新建模板
				</Button>
			</Can>
		</div>
	);

	if (!canViewTemplates) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要首件检验权限才能查看模板列表。" />
			</div>
		);
	}

	return (
		<>
			<DataListLayout
				mode="server"
				data={data?.items || []}
				columns={faiTemplateColumns}
				pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
				onPaginationChange={handlePaginationChange}
				initialPageIndex={(searchParams.page || 1) - 1}
				initialPageSize={searchParams.pageSize || 30}
				locationSearch={locationSearch}
				isLoading={isLoading}
				tableMeta={tableMeta}
				header={header}
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
							placeholder: "搜索模板编码、名称或产品型号...",
						},
						{
							key: "processType",
							type: "select",
							label: "工艺类型",
							options: processTypeOptions,
							width: "w-[160px]",
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
					renderCard: (item: FaiTemplateSummary) => (
						<FaiTemplateCard
							template={item}
							onEdit={handleEdit}
							onToggleActive={handleToggleActive}
						/>
					),
				}}
			/>

			<TemplateDialog
				open={dialogOpen}
				onOpenChange={handleDialogClose}
				template={editingTemplate ?? null}
				isLoading={isTemplateLoading}
			/>
		</>
	);
}
