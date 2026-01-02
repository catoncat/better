import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { useRouteList } from "@/hooks/use-routes";
import { useCreateRun } from "@/hooks/use-runs";
import {
	useCancelWorkOrder,
	useReceiveWorkOrder,
	useReleaseWorkOrder,
	useUpdatePickStatus,
	useWorkOrderList,
	type WorkOrder,
} from "@/hooks/use-work-orders";
import { PickStatusDialog, type PickStatusFormValues } from "./-components/pick-status-dialog";
import { RunCreateDialog, type RunFormValues } from "./-components/run-create-dialog";
import { WorkOrderCard } from "./-components/work-order-card";
import { workOrderColumns } from "./-components/work-order-columns";
import { WorkOrderReceiveDialog } from "./-components/work-order-receive-dialog";
import {
	WorkOrderReleaseDialog,
	type WorkOrderReleaseFormValues,
} from "./-components/work-order-release-dialog";

interface WorkOrderFilters {
	search: string;
	status: string[];
	erpPickStatus?: string[];
	routingId?: string[];
}

interface WorkOrderSearchParams {
	search?: string;
	status?: string;
	erpPickStatus?: string;
	routingId?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/work-orders")({
	validateSearch: (search: Record<string, unknown>): WorkOrderSearchParams => ({
		search: (search.search as string) || undefined,
		status: (search.status as string) || undefined,
		erpPickStatus: (search.erpPickStatus as string) || undefined,
		routingId: (search.routingId as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: WorkOrdersPage,
});

function WorkOrdersPage() {
	const viewPreferencesKey = "work-orders";
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/work-orders" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";

	const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
	const [runDialogOpen, setRunDialogOpen] = useState(false);
	const [pickStatusDialogOpen, setPickStatusDialogOpen] = useState(false);
	const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

	// Parse filters from URL
	const filters: WorkOrderFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			status: searchParams.status?.split(",").filter(Boolean) || [],
			erpPickStatus: searchParams.erpPickStatus?.split(",").filter(Boolean) || [],
			routingId: searchParams.routingId?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return (
			filters.search !== "" ||
			filters.status.length > 0 ||
			(filters.erpPickStatus?.length ?? 0) > 0 ||
			(filters.routingId?.length ?? 0) > 0
		);
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
		(newFilters: Partial<WorkOrderFilters>) => {
			const newSearch: WorkOrderSearchParams = { ...searchParams, page: 1 };
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
			search: { page: 1, pageSize: searchParams.pageSize },
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	// Pagination state (driven by URL via DataListLayout server mode)
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

	// Sync pagination state from URL (sorting/filtering resets page)
	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 30);
	}, [searchParams.page, searchParams.pageSize]);

	const { mutateAsync: receiveWO, isPending: isReceiving } = useReceiveWorkOrder();
	const { mutateAsync: releaseWO, isPending: isReleasing } = useReleaseWorkOrder();
	const { mutateAsync: cancelWO, isPending: isCancelling } = useCancelWorkOrder();
	const { mutateAsync: updatePickStatus, isPending: isUpdatingPickStatus } = useUpdatePickStatus();
	const { mutateAsync: createRun, isPending: isCreatingRun } = useCreateRun();

	// Query presets
	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<WorkOrderFilters>({ storageKey: "work-orders" });

	// System presets
	const systemPresets = useMemo((): SystemPreset<WorkOrderFilters>[] => {
		return [
			{
				id: "ready",
				name: "可开工",
				filters: { status: ["RELEASED"], erpPickStatus: ["2", "3", "4"] },
			},
			{
				id: "waiting-material",
				name: "待齐料",
				filters: { status: ["RELEASED"], erpPickStatus: ["1"] },
			},
			{ id: "in-progress", name: "生产中", filters: { status: ["IN_PROGRESS"] } },
			{ id: "completed", name: "已完成", filters: { status: ["COMPLETED", "CLOSED"] } },
			{ id: "cancelled", name: "已取消", filters: { status: ["CANCELLED"] } },
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
		(presetId: string, presetFilters: Partial<WorkOrderFilters>) => {
			const newFilters: Partial<WorkOrderFilters> = {
				search: "",
				status: [],
				erpPickStatus: [],
				routingId: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	// Fetch route list for filter options
	const { data: routeListData } = useRouteList({ page: 1, pageSize: 100 });
	const routeOptions = useMemo(() => {
		if (!routeListData?.items) return [];
		return routeListData.items.map((r) => ({
			label: `${r.code} ${r.name}`,
			value: r.id,
		}));
	}, [routeListData]);

	const { data, isLoading, error } = useWorkOrderList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search || undefined,
		status: filters.status.length > 0 ? filters.status.join(",") : undefined,
		erpPickStatus:
			filters.erpPickStatus && filters.erpPickStatus.length > 0
				? filters.erpPickStatus.join(",")
				: undefined,
		routingId:
			filters.routingId && filters.routingId.length > 0 ? filters.routingId.join(",") : undefined,
		sort: searchParams.sort,
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

	const handleReleaseOpen = useCallback((wo: WorkOrder) => {
		setSelectedWO(wo);
		setReleaseDialogOpen(true);
	}, []);

	const handleCreateRunOpen = useCallback((wo: WorkOrder) => {
		setSelectedWO(wo);
		setRunDialogOpen(true);
	}, []);

	const handleEditPickStatusOpen = (wo: WorkOrder) => {
		setSelectedWO(wo);
		setPickStatusDialogOpen(true);
	};

	const handleCancelOpen = (wo: WorkOrder) => {
		setSelectedWO(wo);
		setCancelDialogOpen(true);
	};

	const handleReceiveSubmit = async (values: Parameters<typeof receiveWO>[0]) => {
		await receiveWO(values);
	};

	const handleRunSubmit = async (values: RunFormValues) => {
		if (selectedWO) {
			const result = await createRun({ woNo: selectedWO.woNo, ...values });
			const runNo = (result as { data?: { runNo?: string } } | undefined)?.data?.runNo;
			if (runNo) {
				navigate({ to: "/mes/runs/$runNo", params: { runNo } });
			}
		}
	};

	const handleReleaseSubmit = async (values: WorkOrderReleaseFormValues) => {
		if (selectedWO) {
			await releaseWO({ woNo: selectedWO.woNo, ...values });
		}
	};

	const handlePickStatusSubmit = async (values: PickStatusFormValues) => {
		if (selectedWO) {
			await updatePickStatus({ woNo: selectedWO.woNo, pickStatus: values.pickStatus });
		}
	};

	const handleCancelConfirm = async () => {
		if (!selectedWO) return;
		await cancelWO({ woNo: selectedWO.woNo });
		setCancelDialogOpen(false);
	};

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={workOrderColumns}
			initialSorting={initialSorting}
			onSortingChange={handleSortingChange}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 30}
			locationSearch={locationSearch}
			isLoading={isLoading}
			error={
				error ? (
					<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
						加载失败：{error instanceof Error ? error.message : "未知错误"}
					</div>
				) : null
			}
			tableMeta={{
				onRelease: handleReleaseOpen,
				onCreateRun: handleCreateRunOpen,
				onEditPickStatus: handleEditPickStatusOpen,
				onCancel: handleCancelOpen,
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item) => (
					<WorkOrderCard
						workOrder={item as WorkOrder}
						onCreateRun={handleCreateRunOpen}
						onRelease={handleReleaseOpen}
						onEditPickStatus={handleEditPickStatusOpen}
						onCancel={handleCancelOpen}
					/>
				),
			}}
			viewPreferencesKey={viewPreferencesKey}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">工单管理</h1>
						<p className="text-muted-foreground">管理生产工单的接收与发布</p>
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
					{
						key: "routingId",
						type: "multiSelect",
						label: "路由工艺",
						options: routeOptions,
					},
				],
				filters,
				onFilterChange: setFilter,
				onFiltersChange: setFilters,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
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
			<WorkOrderReleaseDialog
				open={releaseDialogOpen}
				onOpenChange={setReleaseDialogOpen}
				onSubmit={handleReleaseSubmit}
				isSubmitting={isReleasing}
				workOrder={selectedWO}
			/>
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
			<PickStatusDialog
				open={pickStatusDialogOpen}
				onOpenChange={setPickStatusDialogOpen}
				onSubmit={handlePickStatusSubmit}
				isSubmitting={isUpdatingPickStatus}
				workOrder={selectedWO}
			/>
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>取消工单</AlertDialogTitle>
						<AlertDialogDescription>
							确认取消工单 {selectedWO?.woNo}？取消后将无法继续生产。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>返回</AlertDialogCancel>
						<AlertDialogAction onClick={handleCancelConfirm} disabled={isCancelling}>
							{isCancelling ? "正在取消..." : "确认取消"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DataListLayout>
	);
}
