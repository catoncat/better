import { flexRender, type Row } from "@tanstack/react-table";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableRowProps<TData> {
	row: Row<TData>;
}

export function DataTableRow<TData>({ row }: DataTableRowProps<TData>) {
	return (
		<TableRow data-state={row.getIsSelected() && "selected"}>
			{row.getVisibleCells().map((cell) => {
				const meta = cell.column.columnDef.meta as { sticky?: "right" } | undefined;
				const stickyClass =
					meta?.sticky === "right"
						? "sticky right-0 z-10 bg-background border-l group-hover:bg-muted/50"
						: undefined;
				return (
					<TableCell key={cell.id} className={cn(stickyClass)}>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				);
			})}
		</TableRow>
	);
}
