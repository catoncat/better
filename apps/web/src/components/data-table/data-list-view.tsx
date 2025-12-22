import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	type CardColumns as PrefCardColumns,
	type ViewMode as PrefViewMode,
	useViewPreferences,
} from "@/hooks/use-view-preferences";
import { cn } from "@/lib/utils";
import { DataCardList, type DataCardListProps } from "./data-card-list";
import { DataTable } from "./data-table";
import type { TableAction } from "./table-actions";

export type ViewMode = "table" | "card" | "auto";
export type CardColumns = 1 | 2 | 3 | 4;

export interface DataListViewProps<TData, TValue> {
	table: TableInstance<TData>;
	columns: ColumnDef<TData, TValue>[];
	renderCard?: (item: TData, index: number, actions?: TableAction[]) => ReactNode;
	getCardActions?: (item: TData) => TableAction[];
	getItemActions?: (item: TData) => TableAction[];
	cardProps?: Omit<DataCardListProps<TData>, "items" | "columns">;
	emptyMessage?: string;
	className?: string;
	viewPreferencesKey?: string;
	defaultViewMode?: PrefViewMode;
	defaultCardColumns?: PrefCardColumns;
}

export function DataListView<TData, TValue>({
	table,
	columns,
	renderCard,
	getCardActions,
	getItemActions,
	cardProps,
	emptyMessage,
	className,
	viewPreferencesKey,
	defaultViewMode,
	defaultCardColumns,
}: DataListViewProps<TData, TValue>) {
	const { viewMode, cardColumns } = useViewPreferences({
		storageKey: viewPreferencesKey,
		defaultViewMode,
		defaultCardColumns,
	});
	const items = table.getRowModel().rows.map((row) => row.original);

	// viewMode behavior:
	// - "auto" / "table": table on desktop, card on mobile
	// - "card": card on both desktop and mobile

	return (
		<div className={cn(className)}>
			{/* Desktop View */}
			{viewMode === "card" ? (
				// Card mode: show cards on desktop with configurable columns
				<div className="hidden md:block">
					<DataCardList
						items={items}
						columns={cardColumns}
						renderCard={
							renderCard
								? (item, index) => renderCard(item, index, getItemActions?.(item))
								: undefined
						}
						getActions={getCardActions ?? getItemActions}
						emptyMessage={emptyMessage}
						{...cardProps}
					/>
				</div>
			) : (
				// Table/Auto mode: show table on desktop
				<div className="hidden md:block">
					<DataTable table={table} columns={columns} emptyMessage={emptyMessage} />
				</div>
			)}

			{/* Mobile View - Always show cards */}
			<div className="md:hidden">
				<DataCardList
					items={items}
					columns={1}
					renderCard={
						renderCard
							? (item, index) => renderCard(item, index, getItemActions?.(item))
							: undefined
					}
					getActions={getCardActions ?? getItemActions}
					emptyMessage={emptyMessage}
					{...cardProps}
				/>
			</div>
		</div>
	);
}
