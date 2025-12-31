import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { AlertTriangle, Pencil, Play, Send } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import { useAbility } from "@/hooks/use-ability";
import type { WorkOrder } from "@/hooks/use-work-orders";
import { WORK_ORDER_STATUS_MAP } from "@/lib/constants";

export type WorkOrderTableMeta = {
	onRelease?: (woNo: string) => void;
	onCreateRun?: (wo: WorkOrder) => void;
	onEditPickStatus?: (wo: WorkOrder) => void;
};

export const workOrderColumns: ColumnDef<WorkOrder>[] = [
	{
		accessorKey: "woNo",
		header: "工单号",
		cell: ({ row }) => <span className="font-medium">{row.getValue("woNo")}</span>,
	},
	{
		accessorKey: "productCode",
		header: "产品编码",
	},
	{
		id: "routing",
		header: "路由工艺",
		cell: ({ row }) => {
			const routing = row.original.routing;
			if (!routing) {
				return (
					<span className="inline-flex items-center gap-1 text-amber-600">
						<AlertTriangle className="h-3.5 w-3.5" />
						<span className="text-xs">未关联路由</span>
					</span>
				);
			}
			return (
				<span className="text-sm">
					<span className="font-medium">{routing.code}</span>
					<span className="text-muted-foreground ml-1">{routing.name}</span>
				</span>
			);
		},
	},
	{
		accessorKey: "plannedQty",
		header: "计划数量",
	},
	{
		id: "pickStatus",
		header: "齐料进度",
		cell: ({ row }) => {
			// For ERP work orders, use erpPickStatus; for manual work orders, use pickStatus
			const isErpWorkOrder = Boolean(row.original.erpStatus);
			const status = isErpWorkOrder ? row.original.erpPickStatus : row.original.pickStatus;

			if (!status || status === "1") return <Badge variant="outline">未领料</Badge>;
			if (status === "2")
				return (
					<Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
						部分领料
					</Badge>
				);
			if (status === "3")
				return (
					<Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
						全部领料
					</Badge>
				);
			if (status === "4")
				return (
					<Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
						超额领料
					</Badge>
				);
			return <Badge variant="outline">{status}</Badge>;
		},
	},
	{
		accessorKey: "status",
		header: "状态",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			const label = WORK_ORDER_STATUS_MAP[status] || status;
			let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

			if (status === "RELEASED") variant = "secondary";
			if (status === "IN_PROGRESS") variant = "default";
			if (status === "COMPLETED" || status === "CLOSED") variant = "outline";
			if (status === "CANCELLED") variant = "destructive";

			return <Badge variant={variant}>{label}</Badge>;
		},
	},
	{
		accessorKey: "dueDate",
		header: "到期日期",
		cell: ({ row }) => {
			const date = row.getValue("dueDate");
			if (!date) return "-";
			return format(new Date(date as string), "yyyy-MM-dd");
		},
	},
	{
		accessorKey: "createdAt",
		header: "创建时间",
		cell: ({ row }) => {
			return format(new Date(row.getValue("createdAt") as string), "yyyy-MM-dd HH:mm");
		},
	},
	{
		id: "actions",
		cell: ({ row, table }) => {
			const wo = row.original;
			const meta = table.options.meta as WorkOrderTableMeta | undefined;
			const { hasPermission } = useAbility();

			const actions = [];

			// Check if this is an ERP work order or manual work order
			const isErpWorkOrder = Boolean(wo.erpStatus);
			const effectivePickStatus = isErpWorkOrder ? wo.erpPickStatus : wo.pickStatus;

			if (wo.status === "RECEIVED" && hasPermission(Permission.WO_RELEASE)) {
				actions.push({
					icon: Send,
					label: "发布工单",
					onClick: () => meta?.onRelease?.(wo.woNo),
				});
			}

			// Manual work orders can edit pick status
			if (!isErpWorkOrder && hasPermission(Permission.WO_UPDATE)) {
				actions.push({
					icon: Pencil,
					label: "修改领料状态",
					onClick: () => meta?.onEditPickStatus?.(wo),
				});
			}

			const isMaterialReady = ["2", "3", "4"].includes(effectivePickStatus ?? "");

			if (
				(wo.status === "RELEASED" || wo.status === "IN_PROGRESS") &&
				isMaterialReady &&
				hasPermission(Permission.RUN_CREATE)
			) {
				actions.push({
					icon: Play,
					label: "创建批次",
					onClick: () => meta?.onCreateRun?.(wo),
				});
			}

			return <TableActions actions={actions} />;
		},
	},
];
