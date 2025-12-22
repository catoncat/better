"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
	value?: DateRange;
	onChange?: (date: DateRange | undefined) => void;
	placeholder?: string;
	className?: string;
	align?: "start" | "center" | "end";
	disabled?: boolean;
}

export function DateRangePicker({
	value,
	onChange,
	placeholder = "选择日期范围",
	className,
	align = "start",
	disabled = false,
}: DateRangePickerProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	// Internal state for tracking selection in progress
	const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined);

	// Reset pending range when popover opens
	React.useEffect(() => {
		if (isOpen) {
			setPendingRange(value);
		}
	}, [isOpen, value]);

	const handleSelect = React.useCallback(
		(newDate: DateRange | undefined, selectedDay: Date | undefined) => {
			if (!selectedDay) {
				setPendingRange(newDate);
				return;
			}

			// If we already have a complete range, start fresh
			if (pendingRange?.from && pendingRange?.to) {
				setPendingRange({ from: selectedDay, to: undefined });
				return;
			}

			// If we have a from date, set the to date
			if (pendingRange?.from && !pendingRange?.to) {
				const newRange =
					selectedDay < pendingRange.from
						? { from: selectedDay, to: pendingRange.from }
						: { from: pendingRange.from, to: selectedDay };

				setPendingRange(newRange);
				onChange?.(newRange);
				// Auto-close after selecting complete range
				setTimeout(() => setIsOpen(false), 150);
				return;
			}

			// Start new selection
			setPendingRange({ from: selectedDay, to: undefined });
		},
		[pendingRange, onChange],
	);

	const handleClear = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onChange?.(undefined);
			setPendingRange(undefined);
		},
		[onChange],
	);

	const hasValue = value?.from || value?.to;

	const displayText = React.useMemo(() => {
		if (!value?.from) return null;

		if (value.to) {
			return `${format(value.from, "yyyy/MM/dd", { locale: zhCN })} - ${format(value.to, "yyyy/MM/dd", { locale: zhCN })}`;
		}

		return format(value.from, "yyyy/MM/dd", { locale: zhCN });
	}, [value]);

	return (
		<div className="flex items-center gap-1">
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						disabled={disabled}
						className={cn(
							"w-[280px] justify-start text-left font-normal",
							!hasValue && "text-muted-foreground",
							hasValue && "pr-2",
							className,
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
						<span className="flex-1 truncate">{displayText || placeholder}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align={align}>
					<Calendar
						mode="range"
						defaultMonth={value?.from || new Date()}
						selected={pendingRange}
						onSelect={handleSelect}
						numberOfMonths={2}
						locale={zhCN}
						showOutsideDays={false}
					/>
					{/* Footer with quick actions */}
					<div className="flex items-center justify-between border-t p-3">
						<div className="text-sm text-muted-foreground">
							{pendingRange?.from && !pendingRange?.to && "请选择结束日期"}
							{pendingRange?.from && pendingRange?.to && (
								<>
									已选择{" "}
									{Math.ceil(
										(pendingRange.to.getTime() - pendingRange.from.getTime()) /
											(1000 * 60 * 60 * 24),
									) + 1}{" "}
									天
								</>
							)}
						</div>
						<div className="flex gap-2">
							{(pendingRange?.from || pendingRange?.to) && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setPendingRange(undefined);
										onChange?.(undefined);
									}}
								>
									清除
								</Button>
							)}
							<Button
								size="sm"
								disabled={!pendingRange?.from || !pendingRange?.to}
								onClick={() => {
									if (pendingRange?.from && pendingRange?.to) {
										onChange?.(pendingRange);
										setIsOpen(false);
									}
								}}
							>
								确定
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{hasValue && !disabled && (
				<Button variant="ghost" size="icon-sm" className="h-8 w-8 shrink-0" onClick={handleClear}>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
