import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type DataListFieldMeta<TData> = {
	key: string;
	label: string;
	sortable?: boolean;
	accessorFn?: (item: TData) => unknown;
	tableHidden?: boolean;
	tableCell?: (item: TData) => ReactNode;
	cardPrimary?: boolean;
	cardSecondary?: boolean;
	cardBadge?: boolean;
	cardDetail?: boolean;
	cardLabel?: string;
	cardValue?: (item: TData) => ReactNode;
};

export function createColumnsFromFieldMeta<TData>(
	fields: DataListFieldMeta<TData>[],
): ColumnDef<TData>[] {
	return fields
		.filter((field) => !field.tableHidden)
		.map((field) => {
			const base = field.accessorFn
				? { id: field.key, accessorFn: field.accessorFn }
				: { accessorKey: field.key };

			return {
				...base,
				header: field.label,
				enableSorting: field.sortable ?? false,
				cell: field.tableCell ? ({ row }) => field.tableCell?.(row.original) : undefined,
			} as ColumnDef<TData>;
		});
}
