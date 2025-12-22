import { type ColumnDef, flexRender, type Table as TableInstance } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	table: TableInstance<TData>;
	emptyMessage?: string;
}

export function DataTable<TData, TValue>({
	columns,
	table,
	emptyMessage = "暂无数据",
}: DataTableProps<TData, TValue>) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								const headerDef = header.column.columnDef.header;
								const headerContent = header.isPlaceholder
									? null
									: flexRender(headerDef, header.getContext());
								const canSort =
									!header.isPlaceholder &&
									header.column.getCanSort() &&
									typeof headerDef !== "function";
								const sorted = header.column.getIsSorted();
								return (
									<TableHead key={header.id}>
										{canSort ? (
											<Button
												variant="ghost"
												size="sm"
												className="-ml-2 h-8 px-2 font-medium group"
												onClick={header.column.getToggleSortingHandler()}
											>
												{headerContent}
												{sorted === "asc" ? (
													<ChevronUp className="ml-1 h-3 w-3 text-muted-foreground/70" />
												) : sorted === "desc" ? (
													<ChevronDown className="ml-1 h-3 w-3 text-muted-foreground/70" />
												) : (
													<ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-60 transition-opacity" />
												)}
											</Button>
										) : (
											headerContent
										)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								{emptyMessage}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
