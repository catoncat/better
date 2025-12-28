import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { useCreateRun } from "@/hooks/use-runs";
import {
	useReceiveWorkOrder,
	useReleaseWorkOrder,
	useWorkOrderList,
	type WorkOrder,
} from "@/hooks/use-work-orders";
import { RunCreateDialog, type RunFormValues } from "./-components/run-create-dialog";
import { workOrderColumns } from "./-components/work-order-columns";
import { WorkOrderReceiveDialog } from "./-components/work-order-receive-dialog";

interface WorkOrderSearchParams {
	search?: string;
	status?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/work-orders")({
	validateSearch: (search: Record<string, unknown>): WorkOrderSearchParams => ({
		search: (search.search as string) || undefined,
		status: (search.status as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: WorkOrdersPage,
});

function WorkOrdersPage() {
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/work-orders" });

	const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
	const [runDialogOpen, setRunDialogOpen] = useState(false);
	const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

	const { mutateAsync: receiveWO, isPending: isReceiving } = useReceiveWorkOrder();
	const { mutateAsync: releaseWO } = useReleaseWorkOrder();
	const { mutateAsync: createRun, isPending: isCreatingRun } = useCreateRun();

	const { data, isLoading, error } = useWorkOrderList({
		page: searchParams.page,
		pageSize: searchParams.pageSize,
		search: searchParams.search,
		status: searchParams.status,
		sort: searchParams.sort,
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

	const handleRelease = async (woNo: string) => {
		await releaseWO({ woNo });
	};

	const handleCreateRunOpen = (wo: WorkOrder) => {
		setSelectedWO(wo);
		setRunDialogOpen(true);
	};

	const handleReceiveSubmit = async (values: Parameters<typeof receiveWO>[0]) => {
		await receiveWO(values);
	};

	const handleRunSubmit = async (values: RunFormValues) => {
		if (selectedWO) {
			await createRun({ woNo: selectedWO.woNo, ...values });
		}
	};

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={workOrderColumns}
			pageCount={data?.total ? Math.ceil(data.total / (searchParams.pageSize || 30)) : 1}
			onPaginationChange={handlePaginationChange}
			onSortingChange={handleSortingChange}
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
			tableMeta={{
				onRelease: handleRelease,
				onCreateRun: handleCreateRunOpen,
			}}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">工单管理</h1>
						<p className="text-muted-foreground">管理生产工单的接收与发布</p>
					</div>
				</div>
			}
			filterToolbarProps={{
				fields: [
					{
						key: "search",
						type: "search",
						placeholder: "搜索工单号或产品编码...",
					},
					{
						key: "status",
						type: "multiSelect",
						label: "状态",
						options: [
							{ label: "已接收", value: "RECEIVED" },
							{ label: "已发布", value: "RELEASED" },
							{ label: "进行中", value: "IN_PROGRESS" },
							{ label: "已完成", value: "COMPLETED" },
							{ label: "已关闭", value: "CLOSED" },
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
				isFiltered: !!searchParams.search || !!searchParams.status,
				actions: (
					<Can permissions={Permission.WO_RECEIVE}>
						<Button size="sm" className="h-8" onClick={() => setReceiveDialogOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							接收工单
						</Button>
					</Can>
				),
			}}
		>
			<WorkOrderReceiveDialog
				open={receiveDialogOpen}
				onOpenChange={setReceiveDialogOpen}
				onSubmit={handleReceiveSubmit}
				isSubmitting={isReceiving}
			/>
			<RunCreateDialog
				open={runDialogOpen}
				onOpenChange={setRunDialogOpen}
				onSubmit={handleRunSubmit}
				isSubmitting={isCreatingRun}
				workOrder={selectedWO}
			/>
		</DataListLayout>
	);
}
