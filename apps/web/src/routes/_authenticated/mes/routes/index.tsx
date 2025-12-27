import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { DataListLayout } from "@/components/data-list";
import { useRouteList } from "@/hooks/use-routes";
import { routeColumns } from "../-components/route-columns";

interface RouteSearchParams {
	search?: string;
	sourceSystem?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/routes/")({
	validateSearch: (search: Record<string, unknown>): RouteSearchParams => ({
		search: (search.search as string) || undefined,
		sourceSystem: (search.sourceSystem as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: RouteListPage,
});

function RouteListPage() {
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/routes/" });

	const { data, isLoading, error } = useRouteList({
		page: searchParams.page,
		pageSize: searchParams.pageSize,
		search: searchParams.search,
		sourceSystem: searchParams.sourceSystem,
	});

	const handlePaginationChange = (next: { pageIndex: number; pageSize: number }) => {
		navigate({
			to: ".",
			search: { ...searchParams, page: next.pageIndex + 1, pageSize: next.pageSize },
			replace: true,
		});
	};

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={routeColumns}
			pageCount={data?.total ? Math.ceil(data.total / (searchParams.pageSize || 30)) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
			isLoading={isLoading}
			error={
				error ? (
					<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
						加载失败：{error instanceof Error ? error.message : "未知错误"}
					</div>
				) : null
			}
			header={
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold tracking-tight">路由管理</h1>
					<p className="text-muted-foreground">查看工艺路线、来源与步骤信息。</p>
				</div>
			}
			filterToolbarProps={{
				fields: [
					{
						key: "search",
						type: "search",
						placeholder: "搜索路由编码、名称或产品编码...",
					},
					{
						key: "sourceSystem",
						type: "select",
						label: "来源",
						options: [
							{ label: "全部", value: "all" },
							{ label: "ERP", value: "ERP" },
							{ label: "MES", value: "MES" },
						],
					},
				],
				filters: {
					search: searchParams.search || "",
					sourceSystem: searchParams.sourceSystem || "all",
				},
				onFilterChange: (key, value) => {
					navigate({
						to: ".",
						search: { ...searchParams, [key]: value === "all" ? undefined : value, page: 1 },
						replace: true,
					});
				},
				onReset: () =>
					navigate({
						to: ".",
						search: { page: 1, pageSize: searchParams.pageSize },
						replace: true,
					}),
				isFiltered: !!searchParams.search || !!searchParams.sourceSystem,
			}}
		/>
	);
}
