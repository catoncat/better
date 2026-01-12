import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { DataCollectionSpec } from "@/hooks/use-data-collection-specs";
import { dcSpecFieldMeta } from "./field-meta";

export type DCSpecTableMeta = {
	onEdit?: (spec: DataCollectionSpec) => void;
	onToggleActive?: (spec: DataCollectionSpec) => void;
};

const actionsColumn: ColumnDef<DataCollectionSpec> = {
	id: "actions",
	cell: ({ row, table }) => {
		const spec = row.original;
		const meta = table.options.meta as DCSpecTableMeta | undefined;
		const { hasPermission } = useAbility();

		const actions = [];

		if (hasPermission(Permission.DATA_SPEC_CONFIG)) {
			actions.push({
				icon: Edit,
				label: "编辑",
				onClick: () => meta?.onEdit?.(spec),
			});

			actions.push({
				icon: spec.isActive ? ToggleLeft : ToggleRight,
				label: spec.isActive ? "停用" : "启用",
				onClick: () => meta?.onToggleActive?.(spec),
			});
		}

		if (actions.length === 0) return null;

		return <TableActions actions={actions} />;
	},
	enableSorting: false,
	size: 60,
};

export const dcSpecColumns: ColumnDef<DataCollectionSpec>[] = [
	...createColumnsFromFieldMeta(dcSpecFieldMeta),
	actionsColumn,
];
