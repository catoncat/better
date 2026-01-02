import type { Table } from "@tanstack/react-table";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { ViewModeToggle } from "@/components/data-table/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
	type CardColumns as PrefCardColumns,
	type ViewMode as PrefViewMode,
	useViewPreferences,
} from "@/hooks/use-view-preferences";
import { cn } from "@/lib/utils";

interface DebouncedInputProps
	extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
	value: string;
	onChange: (value: string) => void;
	debounceMs?: number;
}

function DebouncedInput({
	value: externalValue,
	onChange,
	debounceMs = 300,
	className,
	...props
}: DebouncedInputProps) {
	const [internalValue, setInternalValue] = useState(externalValue);
	const isFirstRender = useRef(true);
	const [, startTransition] = useTransition();

	// Sync internal value when external value changes (e.g., reset filters)
	useEffect(() => {
		setInternalValue(externalValue);
	}, [externalValue]);

	// Debounce the onChange callback
	useEffect(() => {
		// Skip the first render to avoid triggering onChange on mount
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		// Don't debounce if value matches external (already synced)
		if (internalValue === externalValue) {
			return;
		}

		const timer = setTimeout(() => {
			startTransition(() => {
				onChange(internalValue);
			});
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [internalValue, debounceMs, onChange, externalValue]);

	const handleClear = () => {
		setInternalValue("");
		onChange("");
	};

	return (
		<div className="relative">
			<Input
				{...props}
				value={internalValue}
				onChange={(e) => setInternalValue(e.target.value)}
				className={cn("pr-8", className)}
			/>
			{internalValue && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}

export interface FilterFieldOption {
	label: string;
	value: string;
	icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterFieldDefinition {
	key: string;
	type: "search" | "select" | "multiSelect" | "date" | "dateRange" | "custom";
	label?: string;
	placeholder?: string;
	options?: FilterFieldOption[];
	width?: string;
	hideOnMobile?: boolean;
	render?: (value: unknown, onChange: (value: unknown) => void) => React.ReactNode;
	// For dateRange type, specify the from/to keys
	dateFromKey?: string;
	dateToKey?: string;
	// For date type, optional constraints
	fromDate?: Date;
	toDate?: Date;
}

interface FilterToolbarProps {
	fields: FilterFieldDefinition[];
	// biome-ignore lint/suspicious/noExplicitAny: filters can be of various shapes depending on the page
	filters: Record<string, any>;
	onFilterChange: (key: string, value: unknown) => void;
	onReset: () => void;
	isFiltered: boolean;
	actions?: React.ReactNode;
	showViewToggle?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Table generic requires propagating TData through entire component tree
	table?: Table<any>;
	className?: string;
	viewPreferencesKey?: string;
	defaultViewMode?: PrefViewMode;
	defaultCardColumns?: PrefCardColumns;
}

export function FilterToolbar({
	fields,
	filters,
	onFilterChange,
	onReset,
	isFiltered,
	actions,
	showViewToggle = true,
	table,
	className,
	viewPreferencesKey,
	defaultViewMode,
	defaultCardColumns,
}: FilterToolbarProps) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const { viewMode, cardColumns, setViewMode, setCardColumns } = useViewPreferences({
		storageKey: viewPreferencesKey,
		defaultViewMode,
		defaultCardColumns,
	});

	// Separate search fields from other filter fields
	const searchField = fields.find((f) => f.type === "search");
	const filterFields = fields.filter((f) => f.type !== "search");

	// Count active filters (excluding search)
	const activeFilterCount = filterFields.reduce((count, field) => {
		if (field.type === "dateRange") {
			const fromKey = field.dateFromKey || "dateFrom";
			const toKey = field.dateToKey || "dateTo";
			if (filters[fromKey] || filters[toKey]) return count + 1;
		} else {
			const value = filters[field.key];
			if (value && (Array.isArray(value) ? value.length > 0 : true)) {
				return count + 1;
			}
		}
		return count;
	}, 0);

	const renderField = (field: FilterFieldDefinition) => {
		const value = filters[field.key];

		switch (field.type) {
			case "search":
				return (
					<DebouncedInput
						key={field.key}
						placeholder={field.placeholder || "搜索..."}
						value={(value as string) || ""}
						onChange={(v) => onFilterChange(field.key, v)}
						className={cn("h-8 w-full md:w-[200px] lg:w-[250px]", field.width)}
					/>
				);

			case "select":
				return (
					<Select
						key={field.key}
						value={(value as string) || ""}
						onValueChange={(v) => onFilterChange(field.key, v)}
					>
						<SelectTrigger className={cn("h-8 w-[150px]", field.width)}>
							<SelectValue placeholder={field.placeholder || field.label} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "multiSelect":
				return (
					<DataTableFacetedFilter
						key={field.key}
						title={field.label}
						options={field.options || []}
						value={(value as string[]) || []}
						onChange={(v) => onFilterChange(field.key, v)}
					/>
				);

			case "date": {
				const dateValue = value as string | undefined;
				return (
					<DatePicker
						key={field.key}
						value={dateValue ? new Date(dateValue) : undefined}
						onChange={(date) => {
							// Use ISO string for proper timezone handling
							onFilterChange(field.key, date ? date.toISOString() : "");
						}}
						placeholder={field.placeholder || field.label || "选择日期"}
						className={cn("h-8 w-[150px] border-dashed", field.width)}
						fromDate={field.fromDate}
						toDate={field.toDate}
					/>
				);
			}

			case "dateRange": {
				const fromKey = field.dateFromKey || "dateFrom";
				const toKey = field.dateToKey || "dateTo";
				const fromValue = filters[fromKey] as string | undefined;
				const toValue = filters[toKey] as string | undefined;

				return (
					<DateRangePicker
						key={field.key}
						value={
							fromValue || toValue
								? {
										from: fromValue ? new Date(fromValue) : undefined,
										to: toValue ? new Date(toValue) : undefined,
									}
								: undefined
						}
						onChange={(range) => {
							// Use ISO strings for proper timezone handling
							const fromStr = range?.from ? range.from.toISOString() : "";
							const toStr = range?.to ? range.to.toISOString() : "";
							onFilterChange("__dateRange__", { fromKey, toKey, from: fromStr, to: toStr });
						}}
						className="h-8 border-dashed"
					/>
				);
			}

			case "custom":
				return field.render ? field.render(value, (v) => onFilterChange(field.key, v)) : null;

			default:
				return null;
		}
	};

	// Render field with label for mobile Sheet
	const renderFieldWithLabel = (field: FilterFieldDefinition) => {
		return (
			<div key={field.key} className="space-y-2">
				<Label className="text-sm font-medium">{field.label || field.placeholder}</Label>
				{renderField(field)}
			</div>
		);
	};

	return (
		<>
			{/* Mobile Layout - Sticky */}
			<div
				className={cn(
					"sticky top-12 z-10 bg-background py-2 -mx-4 px-4 border-b md:hidden flex items-center gap-2",
					className,
				)}
			>
				{searchField && <div className="flex-1">{renderField(searchField)}</div>}
				{filterFields.length > 0 && (
					<Button
						variant="outline"
						size="sm"
						className="shrink-0"
						onClick={() => setSheetOpen(true)}
					>
						<SlidersHorizontal className="h-4 w-4 mr-1" />
						筛选
						{activeFilterCount > 0 && (
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
								{activeFilterCount}
							</Badge>
						)}
					</Button>
				)}
				{actions}
			</div>

			{/* Desktop Layout */}
			<div
				className={cn(
					"hidden md:flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
					className,
				)}
			>
				<div className="flex flex-1 flex-wrap items-center gap-2">
					{fields.map((field) => (
						<div key={field.key} className={cn(field.hideOnMobile && "hidden md:block")}>
							{renderField(field)}
						</div>
					))}

					{isFiltered && (
						<Button variant="ghost" onClick={onReset} className="h-8 px-2 lg:px-3">
							清空筛选
							<X className="ml-2 h-4 w-4" />
						</Button>
					)}
				</div>

				<div className="flex items-center space-x-2">
					{showViewToggle && (
						<ViewModeToggle
							viewMode={viewMode}
							onViewModeChange={setViewMode}
							cardColumns={cardColumns}
							onCardColumnsChange={setCardColumns}
						/>
					)}
					{table && <DataTableViewOptions table={table} />}
					{actions}
				</div>
			</div>

			{/* Mobile Filter Sheet */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" className="h-auto max-h-[80vh]">
					<SheetHeader className="px-4">
						<SheetTitle>筛选条件</SheetTitle>
					</SheetHeader>
					<div className="grid gap-4 px-4 py-4 overflow-y-auto">
						{filterFields.map(renderFieldWithLabel)}
					</div>
					<SheetFooter className="flex-row gap-2 px-4">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => {
								onReset();
								setSheetOpen(false);
							}}
						>
							清空筛选
						</Button>
						<Button className="flex-1" onClick={() => setSheetOpen(false)}>
							确定
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
