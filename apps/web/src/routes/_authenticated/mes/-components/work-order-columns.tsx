import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Play, Send } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import { useAbility } from "@/hooks/use-ability";
import type { WorkOrder } from "@/hooks/use-work-orders";
import { WORK_ORDER_STATUS_MAP } from "@/lib/constants";

export type WorkOrderTableMeta = {
	onRelease?: (woNo: string) => void;
	onCreateRun?: (wo: WorkOrder) => void;
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
		accessorKey: "plannedQty",
		header: "计划数量",
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

			if (wo.status === "RECEIVED" && hasPermission(Permission.WO_RELEASE)) {
				actions.push({
					icon: Send,
					label: "发布工单",
					onClick: () => meta?.onRelease?.(wo.woNo),
				});
			}

			if (
				(wo.status === "RELEASED" || wo.status === "IN_PROGRESS") &&
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
