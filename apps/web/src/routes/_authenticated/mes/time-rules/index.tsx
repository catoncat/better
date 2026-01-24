import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useAbility } from "@/hooks/use-ability";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	type TimeRuleDefinition,
	useTimeRuleList,
	useUpdateTimeRule,
} from "@/hooks/use-time-rules";
import { TimeRuleCard } from "./-components/card";
import { type TimeRuleTableMeta, timeRuleColumns } from "./-components/columns";
import { TimeRuleDialog } from "./-components/time-rule-dialog";

interface TimeRuleFilters {
	search: string;
	ruleType?: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
	isActive?: "true" | "false";
}

interface TimeRuleSearchParams {
	search?: string;
	ruleType?: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
	isActive?: "true" | "false";
	sort?: string;
	page?: number;
	pageSize?: number;
}

const ruleTypeValues = ["SOLDER_PASTE_EXPOSURE", "WASH_TIME_LIMIT"] as const;
const isActiveValues = ["true", "false"] as const;
const sortByValues = [
	"code",
	"name",
	"ruleType",
	"durationMinutes",
	"warningMinutes",
	"scope",
	"isActive",
	"createdAt",
	"updatedAt",
] as const;

const parseRuleType = (value: unknown): TimeRuleSearchParams["ruleType"] => {
	return ruleTypeValues.includes(value as (typeof ruleTypeValues)[number])
		? (value as (typeof ruleTypeValues)[number])
		: undefined;
};

const parseIsActive = (value: unknown): TimeRuleSearchParams["isActive"] => {
	return isActiveValues.includes(value as (typeof isActiveValues)[number])
		? (value as (typeof isActiveValues)[number])
		: undefined;
};

const parseSort = (
	value?: string,
): {
	sortBy?: (typeof sortByValues)[number];
	sortDir?: "asc" | "desc";
} => {
	if (!value) return {};
	const [sortBy, sortDir] = value.split(".");
	return {
		sortBy: sortByValues.includes(sortBy as (typeof sortByValues)[number])
			? (sortBy as (typeof sortByValues)[number])
			: undefined,
		sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : undefined,
	};
};

export const Route = createFileRoute("/_authenticated/mes/time-rules/")({
	validateSearch: (search: Record<string, unknown>): TimeRuleSearchParams => ({
		search: (search.search as string) || undefined,
		ruleType: parseRuleType(search.ruleType),
		isActive: parseIsActive(search.isActive),
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: TimeRulesPage,
});

function TimeRulesPage() {
	const viewPreferencesKey = "mes-time-rules";
	const navigate = useNavigate();
	const searchParams = useSearch({
		from: "/_authenticated/mes/time-rules/",
	});
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canViewRules = hasPermission(Permission.READINESS_CONFIG);
	const { mutateAsync: updateRule } = useUpdateTimeRule();

	// Dialog state
	const [editingRule, setEditingRule] = useState<TimeRuleDefinition | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Parse filters from URL
	const filters: TimeRuleFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			ruleType: searchParams.ruleType,
			isActive: searchParams.isActive,
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || Boolean(filters.ruleType) || Boolean(filters.isActive);
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
		(newFilters: Partial<TimeRuleFilters>) => {
			const newSearch: TimeRuleSearchParams = {
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
	} = useQueryPresets<TimeRuleFilters>({
		storageKey: viewPreferencesKey,
	});

	// System presets
	const systemPresets = useMemo((): SystemPreset<TimeRuleFilters>[] => {
		return [
			{ id: "active", name: "启用中", filters: { isActive: "true" } },
			{ id: "exposure", name: "锡膏暴露规则", filters: { ruleType: "SOLDER_PASTE_EXPOSURE" } },
			{ id: "interval", name: "水洗时间规则", filters: { ruleType: "WASH_TIME_LIMIT" } },
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
		(presetId: string, presetFilters: Partial<TimeRuleFilters>) => {
			const newFilters: Partial<TimeRuleFilters> = {
				search: "",
				ruleType: undefined,
				isActive: undefined,
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	// Data query
	const { data, isLoading } = useTimeRuleList(
		{
			page: pageIndex + 1,
			pageSize,
			name: filters.search || undefined,
			ruleType: filters.ruleType,
			isActive: filters.isActive,
			...parseSort(searchParams.sort),
		},
		{ enabled: canViewRules },
	);

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
	const handleEdit = useCallback((rule: TimeRuleDefinition) => {
		setEditingRule(rule);
		setIsDialogOpen(true);
	}, []);

	const handleToggleActive = useCallback(
		async (rule: TimeRuleDefinition) => {
			try {
				await updateRule({
					ruleId: rule.id,
					isActive: !rule.isActive,
				});
			} catch {
				// Error handled by mutation
			}
		},
		[updateRule],
	);

	const handleCreate = useCallback(() => {
		setEditingRule(null);
		setIsDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback((open: boolean) => {
		setIsDialogOpen(open);
		if (!open) {
			setEditingRule(null);
		}
	}, []);

	const tableMeta: TimeRuleTableMeta = {
		onEdit: handleEdit,
		onToggleActive: handleToggleActive,
	};

	const header = (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">时间规则管理</h1>
				<p className="text-muted-foreground">
					配置生产过程中的时间约束规则（如暴露时间、工序间隔等）
				</p>
			</div>
			<Can permissions={Permission.READINESS_CONFIG}>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 h-4 w-4" />
					新建规则
				</Button>
			</Can>
		</div>
	);

	if (!canViewRules) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要配置权限才能查看该列表。" />
			</div>
		);
	}

	return (
		<>
			<DataListLayout
				mode="server"
				data={data?.items || []}
				columns={timeRuleColumns}
				initialSorting={initialSorting}
				onSortingChange={handleSortingChange}
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
							placeholder: "搜索规则名称或代码...",
						},
						{
							key: "ruleType",
							type: "select",
							label: "规则类型",
							placeholder: "全部类型",
							options: [
								{ label: "锡膏暴露 (SOLDER_PASTE_EXPOSURE)", value: "SOLDER_PASTE_EXPOSURE" },
								{ label: "水洗时限 (WASH_TIME_LIMIT)", value: "WASH_TIME_LIMIT" },
							],
							width: "w-[200px]",
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
					renderCard: (item: TimeRuleDefinition) => (
						<TimeRuleCard rule={item} onEdit={handleEdit} onToggleActive={handleToggleActive} />
					),
				}}
			/>

			<TimeRuleDialog open={isDialogOpen} onOpenChange={handleDialogClose} rule={editingRule} />
		</>
	);
}
