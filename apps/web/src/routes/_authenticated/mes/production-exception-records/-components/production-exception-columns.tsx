import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { Check } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { ProductionExceptionRecord } from "@/hooks/use-production-exception-records";
import { productionExceptionFieldMeta } from "./production-exception-field-meta";

export type ProductionExceptionTableMeta = {
	onConfirm?: (record: ProductionExceptionRecord) => void;
};

const actionsColumn: ColumnDef<ProductionExceptionRecord> = {
	id: "actions",
	cell: ({ row, table }) => {
		const record = row.original;
		const meta = table.options.meta as ProductionExceptionTableMeta | undefined;
		const { hasPermission } = useAbility();
		const actions = [];

		if (hasPermission(Permission.QUALITY_OQC) && !record.confirmedAt) {
			actions.push({
				icon: Check,
				label: "确认闭环",
				onClick: () => meta?.onConfirm?.(record),
			});
		}

		if (actions.length === 0) return null;
		return <TableActions actions={actions} />;
	},
	enableSorting: false,
	size: 60,
};

export const productionExceptionColumns: ColumnDef<ProductionExceptionRecord>[] = [
	...createColumnsFromFieldMeta(productionExceptionFieldMeta),
	actionsColumn,
];
