import { Permission } from "@better-app/db/permissions";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAbility } from "@/hooks/use-ability";
import type { Run } from "@/hooks/use-runs";
import { RUN_STATUS_MAP } from "@/lib/constants";

type RunWithReadiness = Run & { readinessStatus?: string | null };

export type RunTableMeta = {
	onAuthorize?: (runNo: string) => void;
	onRevoke?: (runNo: string) => void;
	isRunSelected?: (runNo: string) => boolean;
	onSelectRun?: (runNo: string, selected: boolean) => void;
	onSelectAll?: (runNos: string[], selected: boolean) => void;
};

export const runColumns: ColumnDef<Run>[] = [
	{
		id: "select",
		header: ({ table }) => {
			const meta = table.options.meta as RunTableMeta | undefined;
			const runNos = table.getRowModel().rows.map((row) => row.original.runNo);
			const selectedCount = runNos.filter((runNo) => meta?.isRunSelected?.(runNo)).length;
			const allCount = runNos.length;
			const checked =
				allCount > 0 && selectedCount === allCount
					? true
					: selectedCount > 0
						? "indeterminate"
						: false;

			return (
				<Checkbox
					checked={checked}
					onCheckedChange={(value) => {
						meta?.onSelectAll?.(runNos, value === true);
					}}
					aria-label="选择全部"
				/>
			);
		},
		cell: ({ row, table }) => {
			const meta = table.options.meta as RunTableMeta | undefined;
			const runNo = row.original.runNo;
			return (
				<Checkbox
					checked={meta?.isRunSelected?.(runNo) ?? false}
					onCheckedChange={(value) => {
						meta?.onSelectRun?.(runNo, value === true);
					}}
					aria-label={`选择批次 ${runNo}`}
				/>
			);
		},
		enableSorting: false,
		size: 40,
	},
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
		id: "readinessStatus",
		header: "准备检查",
		cell: ({ row }) => {
			const readinessStatus = (row.original as RunWithReadiness).readinessStatus;
			if (!readinessStatus) return <span className="text-muted-foreground">-</span>;

			const map: Record<
				string,
				{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
			> = {
				PENDING: { label: "检查中", variant: "outline" },
				PASSED: { label: "通过", variant: "secondary" },
				FAILED: { label: "失败", variant: "destructive" },
			};

			const config = map[readinessStatus] ?? {
				label: readinessStatus,
				variant: "outline" as const,
			};
			return <Badge variant={config.variant}>{config.label}</Badge>;
		},
		enableSorting: false,
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
			const { hasPermission } = useAbility();

			const actions = [];

			if (
				(run.status === "PREP" || run.status === "FAI_PENDING") &&
				hasPermission(Permission.RUN_AUTHORIZE)
			) {
				actions.push({
					icon: CheckCircle,
					label: "授权生产",
					onClick: () => meta?.onAuthorize?.(run.runNo),
				});
			}

			if (run.status === "AUTHORIZED" && hasPermission(Permission.RUN_REVOKE)) {
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
