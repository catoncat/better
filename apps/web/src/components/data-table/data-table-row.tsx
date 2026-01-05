import { flexRender, type Row } from "@tanstack/react-table";
import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

interface DataTableRowProps<TData> {
	row: Row<TData>;
}

function DataTableRowComponent<TData>({ row }: DataTableRowProps<TData>) {
	return (
		<TableRow data-state={row.getIsSelected() && "selected"}>
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	);
}

export const DataTableRow = memo(DataTableRowComponent) as typeof DataTableRowComponent;
