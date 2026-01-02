import type { ColumnDef, TableMeta } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import type { UserItem } from "@/hooks/use-users";
import { userFieldMeta } from "./user-field-meta";

const actionsColumn: ColumnDef<UserItem> = {
	id: "actions",
	cell: ({ row, table }) => {
		const meta = table.options.meta as TableMeta<UserItem> & {
			onEdit?: (user: UserItem) => void;
		};

		return (
			<TableActions
				actions={[
					{
						icon: Pencil,
						label: "编辑资料",
						onClick: () => meta?.onEdit?.(row.original),
					},
				]}
			/>
		);
	},
};

export const userColumns: ColumnDef<UserItem>[] = [
	...createColumnsFromFieldMeta(userFieldMeta),
	actionsColumn,
];
