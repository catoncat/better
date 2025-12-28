import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
	value: string;
	label: string;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	value: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
}

export function MultiSelect({
	options,
	value,
	onValueChange,
	placeholder = "请选择...",
	searchPlaceholder,
	emptyText = "未找到选项",
	className,
	disabled = false,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const selectedLabels = options
		.filter((option) => value.includes(option.value))
		.map((option) => option.label);
	const displayLabel =
		selectedLabels.length === 0
			? placeholder
			: selectedLabels.length <= 2
				? selectedLabels.join("、")
				: `${selectedLabels.slice(0, 2).join("、")} 等 ${selectedLabels.length} 项`;

	const toggleValue = (selected: string) => {
		if (value.includes(selected)) {
			onValueChange(value.filter((item) => item !== selected));
			return;
		}
		onValueChange([...value, selected]);
	};

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between min-w-0 overflow-hidden", className)}
					disabled={disabled}
				>
					<span className="flex-1 min-w-0 truncate text-left">{displayLabel}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[calc(100vw-2rem)] sm:max-w-[32rem] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder ?? placeholder} className="h-9" />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = value.includes(option.value);
								return (
									<CommandItem
										key={option.value}
										value={option.label}
										className="gap-2"
										onSelect={() => toggleValue(option.value)}
									>
										<span
											className="flex-1 min-w-0 truncate whitespace-nowrap"
											title={option.label}
										>
											{option.label}
										</span>
										<Check
											className={cn("ml-auto h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
										/>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
