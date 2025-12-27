import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { DataListLayout } from "@/components/data-list";
import { useAuthorizeRun, useRunList } from "@/hooks/use-runs";
import { runColumns } from "../-components/run-columns";

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
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/runs/" });

	const { mutateAsync: authorizeRun } = useAuthorizeRun();

	const { data, isLoading } = useRunList({
		page: searchParams.page,
		pageSize: searchParams.pageSize,
		search: searchParams.search,
		status: searchParams.status,
		sort: searchParams.sort,
		woNo: searchParams.woNo,
	});

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
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
			pageCount={data?.total ? Math.ceil(data.total / (searchParams.pageSize || 30)) : 1}
			onPaginationChange={handlePaginationChange}
			onSortingChange={handleSortingChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
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
				filters: {
					search: searchParams.search || "",
					status: searchParams.status?.split(",").filter(Boolean) || [],
				},
				onFilterChange: (key, value) => {
					const serialized = Array.isArray(value) ? value.join(",") : value;
					navigate({
						to: ".",
						search: { ...searchParams, [key]: serialized || undefined, page: 1 },
						replace: true,
					});
				},
				onReset: () =>
					navigate({
						to: ".",
						search: { page: 1, pageSize: searchParams.pageSize },
						replace: true,
					}),
				isFiltered: !!searchParams.search || !!searchParams.status || !!searchParams.woNo,
			}}
		/>
	);
}
