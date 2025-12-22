import { Check, PlusCircle } from "lucide-react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DataTableFacetedFilterProps<_TData, _TValue> {
	title?: string;
	options: {
		label: string;
		value: string;
		icon?: React.ComponentType<{ className?: string }>;
	}[];
	value?: string[];
	onChange?: (value: string[]) => void;
}

export function DataTableFacetedFilter<TData, TValue>({
	title,
	options,
	value: selectedValues,
	onChange,
}: DataTableFacetedFilterProps<TData, TValue>) {
	const selectedSet = new Set(selectedValues);

	const selectedOptions = options.filter((option) => selectedSet.has(option.value));
	const maxVisibleItems = 3;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 border-dashed">
					<PlusCircle className="mr-2 h-4 w-4" />
					{title}
					{selectedSet.size > 0 && (
						<>
							<Separator orientation="vertical" className="mx-2 h-4" />
							<div className="flex space-x-1">
								{selectedSet.size > maxVisibleItems ? (
									<Badge variant="secondary" className="rounded-sm px-1 font-normal">
										{selectedSet.size} 已选择
									</Badge>
								) : (
									selectedOptions.map((option) => (
										<Badge
											variant="secondary"
											key={option.value}
											className="rounded-sm px-1 font-normal"
										>
											{option.label}
										</Badge>
									))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0" align="start">
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedSet.has(option.value);
								return (
									<CommandItem
										key={option.value}
										onSelect={() => {
											if (isSelected) {
												selectedSet.delete(option.value);
											} else {
												selectedSet.add(option.value);
											}
											const filterValues = Array.from(selectedSet);
											onChange?.(filterValues);
										}}
									>
										<div
											className={cn(
												"mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
												isSelected ? "bg-primary text-white" : "opacity-50 [&_svg]:invisible",
											)}
										>
											<Check className={cn("h-4 w-4 text-white")} />
										</div>
										{option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
										<span>{option.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedSet.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onChange?.([])}
										className="justify-center text-center"
									>
										清除筛选
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
