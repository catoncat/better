import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Input } from "@/components/ui/input";
import { type AuditLogItem, useAuditLogList } from "@/hooks/use-audit-logs";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { AuditLogCard } from "./-components/audit-log-card";
import { auditLogColumns } from "./-components/audit-log-columns";
import { auditEntityTypeOptions, auditStatusOptions } from "./-components/audit-log-field-meta";

type AuditEntityType = AuditLogItem["entityType"];

const auditEntityTypeValueSet = new Set(auditEntityTypeOptions.map((opt) => opt.value));

const isAuditEntityType = (value: string): value is AuditEntityType =>
	value !== "all" && auditEntityTypeValueSet.has(value);

interface AuditLogFilters {
	action: string;
	status: "all" | "SUCCESS" | "FAIL";
	entityType: "all" | AuditEntityType;
	entityId: string;
	actorId: string;
	from?: string;
	to?: string;
}

interface AuditLogSearchParams {
	action?: string;
	status?: string;
	entityType?: string;
	entityId?: string;
	actorId?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/system/audit-logs")({
	validateSearch: (search: Record<string, unknown>): AuditLogSearchParams => ({
		action: (search.action as string) || undefined,
		status: (search.status as string) || undefined,
		entityType: (search.entityType as string) || undefined,
		entityId: (search.entityId as string) || undefined,
		actorId: (search.actorId as string) || undefined,
		from: (search.from as string) || undefined,
		to: (search.to as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: SystemAuditLogsPage,
});

function SystemAuditLogsPage() {
	const viewPreferencesKey = "audit-logs";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/system/audit-logs" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const filters: AuditLogFilters = useMemo(
		() => ({
			action: searchParams.action || "",
			status:
				searchParams.status === "SUCCESS" || searchParams.status === "FAIL"
					? searchParams.status
					: "all",
			entityType:
				searchParams.entityType && isAuditEntityType(searchParams.entityType)
					? searchParams.entityType
					: "all",
			entityId: searchParams.entityId || "",
			actorId: searchParams.actorId || "",
			from: searchParams.from || undefined,
			to: searchParams.to || undefined,
		}),
		[
			searchParams.action,
			searchParams.status,
			searchParams.entityType,
			searchParams.entityId,
			searchParams.actorId,
			searchParams.from,
			searchParams.to,
		],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.action !== "" ||
			filters.status !== "all" ||
			filters.entityType !== "all" ||
			filters.entityId !== "" ||
			filters.actorId !== "" ||
			Boolean(filters.from) ||
			Boolean(filters.to)
		);
	}, [filters]);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized =
				typeof value === "string" ? (value.trim() ? value.trim() : undefined) : value || undefined;
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
		(updates: Partial<AuditLogFilters>) => {
			const nextSearch: AuditLogSearchParams = {
				...searchParams,
				page: 1,
			};
			for (const [key, value] of Object.entries(updates)) {
				if (typeof value === "string") {
					(nextSearch as Record<string, unknown>)[key] = value.trim() ? value.trim() : undefined;
				} else {
					(nextSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: nextSearch,
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
	} = useQueryPresets<AuditLogFilters>({ storageKey: "audit-logs" });

	const systemPresets = useMemo((): SystemPreset<AuditLogFilters>[] => {
		return [
			{ id: "success", name: "成功", filters: { status: "SUCCESS" } },
			{ id: "fail", name: "失败", filters: { status: "FAIL" } },
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
		(presetId: string, presetFilters: Partial<AuditLogFilters>) => {
			const next: Partial<AuditLogFilters> = {
				action: "",
				status: "all",
				entityType: "all",
				entityId: "",
				actorId: "",
				from: undefined,
				to: undefined,
				...presetFilters,
			};
			setFilters(next);
			applyPreset(presetId);
		},
		[applyPreset, setFilters],
	);

	const { data, isLoading, isFetching, error, isError } = useAuditLogList({
		page: pageIndex + 1,
		pageSize,
		actorId: filters.actorId.trim() || undefined,
		entityType: filters.entityType !== "all" ? filters.entityType : undefined,
		entityId: filters.entityId.trim() || undefined,
		action: filters.action.trim() || undefined,
		status: filters.status !== "all" ? filters.status : undefined,
		from: filters.from,
		to: filters.to,
	});

	const pageCount = useMemo(() => {
		if (!data) return 1;
		return Math.max(1, Math.ceil(data.total / data.pageSize));
	}, [data]);

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

	const handleOpenJson = useCallback((item: AuditLogItem) => {
		if (typeof window === "undefined") return;
		window.open(`/api/audit-logs/${item.id}`, "_blank", "noreferrer");
	}, []);

	return (
		<DataListLayout
			mode="server"
			columns={auditLogColumns}
			data={data?.items ?? []}
			pageCount={pageCount}
			onPaginationChange={handlePaginationChange}
			isLoading={isLoading}
			isFetching={isFetching}
			locationSearch={locationSearch}
			viewPreferencesKey={viewPreferencesKey}
			sortingConfig={{ syncWithUrl: false }}
			tableMeta={{ onOpenJson: handleOpenJson }}
			error={
				isError ? (
					<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
						加载失败：{error instanceof Error ? error.message : "未知错误"}
					</div>
				) : null
			}
			header={
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold tracking-tight">审计日志</h1>
					<p className="text-muted-foreground">
						查询关键操作的审计事件（用于排障、追责与合规留痕）。
					</p>
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
					{ key: "action", type: "search", placeholder: "搜索 action（精确匹配）..." },
					{
						key: "status",
						type: "select",
						label: "结果",
						options: auditStatusOptions,
					},
					{
						key: "entityType",
						type: "select",
						label: "实体类型",
						options: auditEntityTypeOptions,
						width: "w-[180px]",
					},
					{
						key: "entityId",
						type: "custom",
						label: "实体 ID",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="entityId..."
								className="h-8 w-[220px]"
							/>
						),
					},
					{
						key: "actorId",
						type: "custom",
						label: "操作者 ID",
						render: (value, onChange) => (
							<Input
								value={(value as string) || ""}
								onChange={(e) => onChange(e.target.value)}
								placeholder="actorId..."
								className="h-8 w-[220px]"
							/>
						),
					},
					{
						key: "createdRange",
						type: "dateRange",
						label: "时间范围",
						dateFromKey: "from",
						dateToKey: "to",
					},
				],
				filters,
				onFilterChange: setFilter,
				onFiltersChange: (updates) => setFilters(updates as Partial<AuditLogFilters>),
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				emptyMessage: "暂无审计日志",
				renderCard: (item: AuditLogItem) => <AuditLogCard item={item} />,
			}}
		/>
	);
}
