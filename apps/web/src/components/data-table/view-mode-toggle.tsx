import { Grid2X2, Grid3X3, LayoutGrid, LayoutList, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "card" | "auto";
export type CardColumns = 1 | 2 | 3 | 4;

export interface ViewModeToggleProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	cardColumns?: CardColumns;
	onCardColumnsChange?: (columns: CardColumns) => void;
	showCardColumnsOption?: boolean;
	className?: string;
}

const columnOptions: { value: CardColumns; label: string; icon: typeof Grid2X2 }[] = [
	{ value: 1, label: "1 列", icon: LayoutList },
	{ value: 2, label: "2 列", icon: Grid2X2 },
	{ value: 3, label: "3 列", icon: Grid3X3 },
	{ value: 4, label: "4 列", icon: LayoutGrid },
];

export function ViewModeToggle({
	viewMode,
	onViewModeChange,
	cardColumns = 3,
	onCardColumnsChange,
	showCardColumnsOption = true,
	className,
}: ViewModeToggleProps) {
	return (
		<div className={cn("hidden md:flex items-center gap-1", className)}>
			{/* Table/Card Toggle */}
			<div className="inline-flex items-center rounded-md border bg-background p-0.5">
				<Button
					variant="ghost"
					size="sm"
					className={cn("h-7 px-2 rounded-sm", viewMode === "table" && "bg-muted")}
					onClick={() => onViewModeChange("table")}
					title="表格视图"
				>
					<TableIcon className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className={cn("h-7 px-2 rounded-sm", viewMode === "card" && "bg-muted")}
					onClick={() => onViewModeChange("card")}
					title="卡片视图"
				>
					<LayoutGrid className="h-4 w-4" />
				</Button>
			</div>

			{/* Card Columns Selector - Only show when in card mode */}
			{viewMode === "card" && showCardColumnsOption && onCardColumnsChange && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-8 px-2">
							{(() => {
								const Icon = columnOptions.find((o) => o.value === cardColumns)?.icon;
								return Icon ? <Icon className="h-4 w-4 mr-1" /> : null;
							})()}
							{cardColumns} 列
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>卡片列数</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{columnOptions.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() => onCardColumnsChange(option.value)}
								className={cn(cardColumns === option.value && "bg-accent")}
							>
								<option.icon className="h-4 w-4 mr-2" />
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
