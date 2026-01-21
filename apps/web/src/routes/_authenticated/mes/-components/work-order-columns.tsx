import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { Link2, Pencil, Play, Send, ShieldCheck } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { WorkOrder } from "@/hooks/use-work-orders";
import { workOrderFieldMeta } from "./work-order-field-meta";

export type WorkOrderTableMeta = {
	onRelease?: (wo: WorkOrder) => void;
	onCreateRun?: (wo: WorkOrder) => void;
	onEditPickStatus?: (wo: WorkOrder) => void;
	onBindRouting?: (wo: WorkOrder) => void;
	onCloseout?: (wo: WorkOrder) => void;
};

const actionsColumn: ColumnDef<WorkOrder> = {
	id: "actions",
	meta: { sticky: "right" },
	cell: ({ row, table }) => {
		const wo = row.original;
		const meta = table.options.meta as WorkOrderTableMeta | undefined;
		const { hasPermission } = useAbility();

		const actions = [];

		// Check if this is an ERP work order or manual work order
		const isErpWorkOrder = Boolean(wo.erpStatus);
		const effectivePickStatus = isErpWorkOrder ? wo.erpPickStatus : wo.pickStatus;

		if (!wo.routing && wo.status !== "COMPLETED" && hasPermission(Permission.WO_UPDATE)) {
			actions.push({
				icon: Link2,
				label: "关联路由",
				onClick: () => meta?.onBindRouting?.(wo),
			});
		}

		if (wo.status === "RECEIVED" && hasPermission(Permission.WO_RELEASE)) {
			actions.push({
				icon: Send,
				label: "发布工单",
				onClick: () => meta?.onRelease?.(wo),
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

		if (wo.status === "IN_PROGRESS" && hasPermission(Permission.WO_CLOSE)) {
			actions.push({
				icon: ShieldCheck,
				label: "收尾关闭",
				onClick: () => meta?.onCloseout?.(wo),
			});
		}

		return <TableActions actions={actions} />;
	},
};

export const workOrderColumns: ColumnDef<WorkOrder>[] = [
	...createColumnsFromFieldMeta(workOrderFieldMeta),
	actionsColumn,
];
