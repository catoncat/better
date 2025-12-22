import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type CardFieldDefinition, DataCard } from "./data-card";
import type { TableAction } from "./table-actions";

export interface DataCardListProps<TData> {
	items: TData[];
	fields?: CardFieldDefinition<TData>[];
	renderCard?: (item: TData, index: number) => ReactNode;
	getItemKey?: (item: TData, index: number) => string | number;
	getActions?: (item: TData) => TableAction[];
	onItemClick?: (item: TData) => void;
	emptyMessage?: string;
	columns?: 1 | 2 | 3 | 4;
	gap?: "sm" | "md" | "lg";
	className?: string;
	cardClassName?: string;
}

const columnClasses = {
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const gapClasses = {
	sm: "gap-2",
	md: "gap-4",
	lg: "gap-6",
};

export function DataCardList<TData>({
	items,
	fields,
	renderCard,
	getItemKey,
	getActions,
	onItemClick,
	emptyMessage = "暂无数据",
	columns = 1,
	gap = "md",
	className,
	cardClassName,
}: DataCardListProps<TData>) {
	if (items.length === 0) {
		return <div className="text-center text-muted-foreground py-8">{emptyMessage}</div>;
	}

	const getKey = (item: TData, index: number): string | number => {
		if (getItemKey) return getItemKey(item, index);
		const itemAny = item as Record<string, unknown>;
		if (itemAny.id !== undefined && itemAny.id !== null) return itemAny.id as string | number;
		return index;
	};

	return (
		<div className={cn("grid", columnClasses[columns], gapClasses[gap], className)}>
			{items.map((item, index) => {
				const key = getKey(item, index);

				if (renderCard) {
					return <div key={key}>{renderCard(item, index)}</div>;
				}

				if (!fields) {
					console.warn("DataCardList: Either fields or renderCard must be provided");
					return null;
				}

				return (
					<DataCard
						key={key}
						item={item}
						fields={fields}
						actions={getActions?.(item)}
						onClick={onItemClick}
						className={cardClassName}
					/>
				);
			})}
		</div>
	);
}
