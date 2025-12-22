"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	fromDate?: Date;
	toDate?: Date;
}

export function DateTimePicker({
	value,
	onChange,
	placeholder = "选择日期时间",
	className,
	disabled = false,
	fromDate,
	toDate,
}: DateTimePickerProps) {
	const [open, setOpen] = React.useState(false);

	const hours = value ? value.getHours().toString().padStart(2, "0") : "00";
	const minutes = value ? value.getMinutes().toString().padStart(2, "0") : "00";

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			onChange?.(undefined);
			return;
		}
		const newDate = new Date(date);
		if (value) {
			newDate.setHours(value.getHours(), value.getMinutes());
		}
		onChange?.(newDate);
	};

	const handleTimeChange = (type: "hours" | "minutes", val: string) => {
		const num = Number.parseInt(val, 10);
		if (Number.isNaN(num)) return;

		const newDate = value ? new Date(value) : new Date();
		if (type === "hours" && num >= 0 && num <= 23) {
			newDate.setHours(num);
		} else if (type === "minutes" && num >= 0 && num <= 59) {
			newDate.setMinutes(num);
		}
		onChange?.(newDate);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					className={cn(
						"w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{value ? format(value, "yyyy/MM/dd HH:mm", { locale: zhCN }) : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleDateSelect}
					initialFocus
					locale={zhCN}
					fromDate={fromDate}
					toDate={toDate}
				/>
				<div className="flex items-center gap-2 border-t p-3">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<Input
						type="number"
						min={0}
						max={23}
						value={hours}
						onChange={(e) => handleTimeChange("hours", e.target.value)}
						className="w-16 text-center"
					/>
					<span className="text-muted-foreground">:</span>
					<Input
						type="number"
						min={0}
						max={59}
						value={minutes}
						onChange={(e) => handleTimeChange("minutes", e.target.value)}
						className="w-16 text-center"
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
