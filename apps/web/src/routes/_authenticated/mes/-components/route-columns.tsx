import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { TableActions } from "@/components/data-table/table-actions";
import type { RouteSummary } from "@/hooks/use-routes";

export type RouteTableMeta = {
	onView?: (routingCode: string) => void;
};

export const routeColumns: ColumnDef<RouteSummary>[] = [
	{
		accessorKey: "code",
		header: "路由编码",
		cell: ({ row }) => {
			const code = row.getValue("code") as string;
			return (
				<Link
					to="/mes/routes/$routingCode"
					params={{ routingCode: code }}
					className="font-medium text-foreground hover:underline"
				>
					{code}
				</Link>
			);
		},
	},
	{
		accessorKey: "name",
		header: "名称",
	},
	{
		accessorKey: "productCode",
		header: "产品编码",
		cell: ({ row }) => row.getValue("productCode") || "-",
	},
	{
		accessorKey: "sourceSystem",
		header: "来源",
		cell: ({ row }) => {
			const value = row.getValue("sourceSystem") as string;
			const label = value === "ERP" ? "ERP" : "MES";
			return <Badge variant={value === "ERP" ? "outline" : "secondary"}>{label}</Badge>;
		},
	},
	{
		accessorKey: "stepCount",
		header: "步骤数",
	},
	{
		accessorKey: "updatedAt",
		header: "更新时间",
		cell: ({ row }) => format(new Date(row.getValue("updatedAt") as string), "yyyy-MM-dd HH:mm"),
	},
	{
		id: "actions",
		cell: ({ row, table }) => {
			const meta = table.options.meta as RouteTableMeta | undefined;
			const routingCode = row.original.code;
			return (
				<TableActions
					actions={[
						{
							icon: Eye,
							label: "查看详情",
							onClick: () => meta?.onView?.(routingCode),
						},
					]}
				/>
			);
		},
	},
];
