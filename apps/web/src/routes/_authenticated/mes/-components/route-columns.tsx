import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { Button } from "@/components/ui/button";
import type { RouteSummary } from "@/hooks/use-routes";
import { routeFieldMeta } from "./route-field-meta";

const actionsColumn: ColumnDef<RouteSummary> = {
	id: "actions",
	cell: ({ row }) => {
		const routingCode = row.original.code;
		return (
			<Button asChild variant="ghost" size="icon" aria-label="查看详情">
				<Link to="/mes/routes/$routingCode" params={{ routingCode }} title="查看详情">
					<Eye className="h-4 w-4" />
				</Link>
			</Button>
		);
	},
};

export const routeColumns: ColumnDef<RouteSummary>[] = [
	...createColumnsFromFieldMeta(routeFieldMeta),
	actionsColumn,
];
