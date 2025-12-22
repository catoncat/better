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

export interface ComboboxOption {
	value: string;
	label: string;
}

interface ComboboxProps {
	options: ComboboxOption[];
	value?: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
	searchValue?: string;
	onSearchValueChange?: (value: string) => void;
}

export function Combobox({
	options,
	value,
	onValueChange,
	placeholder = "Select option...",
	searchPlaceholder,
	emptyText = "No option found.",
	className,
	disabled = false,
	searchValue,
	onSearchValueChange,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const isAsync = typeof onSearchValueChange === "function";

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
					<span className="flex-1 min-w-0 truncate text-left">
						{value ? options.find((option) => option.value === value)?.label : placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[calc(100vw-2rem)] sm:max-w-[32rem] p-0"
				align="start"
			>
				<Command shouldFilter={!isAsync}>
					<CommandInput
						placeholder={searchPlaceholder ?? placeholder}
						className="h-9"
						value={searchValue}
						onValueChange={onSearchValueChange}
					/>
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									className="gap-2"
									onSelect={() => {
										onValueChange(option.value === value ? "" : option.value);
										setOpen(false);
									}}
								>
									<span className="flex-1 min-w-0 truncate whitespace-nowrap" title={option.label}>
										{option.label}
									</span>
									<Check
										className={cn(
											"ml-auto h-4 w-4",
											value === option.value ? "opacity-100" : "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
