import type { ColumnDef, TableMeta } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import type { AuditLogItem } from "@/hooks/use-audit-logs";
import { auditLogFieldMeta } from "./audit-log-field-meta";

const actionsColumn: ColumnDef<AuditLogItem> = {
	id: "actions",
	cell: ({ row, table }) => {
		const meta = table.options.meta as TableMeta<AuditLogItem> & {
			onOpenJson?: (item: AuditLogItem) => void;
		};

		return (
			<TableActions
				actions={[
					{
						icon: ExternalLink,
						label: "查看 JSON",
						onClick: () => meta?.onOpenJson?.(row.original),
					},
				]}
			/>
		);
	},
};

export const auditLogColumns: ColumnDef<AuditLogItem>[] = [
	...createColumnsFromFieldMeta(auditLogFieldMeta),
	actionsColumn,
];
