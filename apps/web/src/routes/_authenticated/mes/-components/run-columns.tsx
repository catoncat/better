import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import type { Run } from "@/hooks/use-runs";
import { RUN_STATUS_MAP } from "@/lib/constants";

export type RunTableMeta = {
	onAuthorize?: (runNo: string) => void;
	onRevoke?: (runNo: string) => void;
};

export const runColumns: ColumnDef<Run>[] = [
	{
		accessorKey: "runNo",
		header: "批次号",
		cell: ({ row }) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: row.getValue("runNo") as string }}
				className="font-medium text-primary hover:underline"
			>
				{row.getValue("runNo")}
			</Link>
		),
	},
	{
		id: "workOrder.woNo",
		accessorFn: (row) => row.workOrder?.woNo,
		header: "工单号",
	},
	{
		id: "lineCode",
		accessorFn: (row) => row.line?.code,
		header: "线体",
	},
	{
		accessorKey: "status",
		header: "状态",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			const label = RUN_STATUS_MAP[status] || status;
			let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

			if (status === "AUTHORIZED") variant = "secondary"; // Success would be better
			if (status === "RUNNING") variant = "default";
			if (status === "CANCELLED") variant = "destructive";

			return <Badge variant={variant}>{label}</Badge>;
		},
	},
	{
		accessorKey: "shiftCode",
		header: "班次",
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
			const run = row.original;
			const meta = table.options.meta as RunTableMeta | undefined;

			const actions = [];

			if (run.status === "PREP" || run.status === "FAI_PENDING") {
				actions.push({
					icon: CheckCircle,
					label: "授权生产",
					onClick: () => meta?.onAuthorize?.(run.runNo),
				});
			}

			if (run.status === "AUTHORIZED") {
				actions.push({
					icon: XCircle,
					label: "撤销授权",
					onClick: () => meta?.onRevoke?.(run.runNo),
				});
			}

			return <TableActions actions={actions} />;
		},
	},
];
