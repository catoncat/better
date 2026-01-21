import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { type LineSummary, useLines } from "@/hooks/use-lines";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

interface LineSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	valueKey?: "code" | "id";
	processType?: LineSummary["processType"];
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function LineSelect({
	value,
	onValueChange,
	valueKey = "code",
	processType,
	disabled,
	placeholder = "选择线体",
	className,
}: LineSelectProps) {
	const { data, isLoading } = useLines();

	const filteredItems = React.useMemo(() => {
		if (!data?.items) return [];
		if (!processType) return data.items;
		return data.items.filter((item) => item.processType === processType);
	}, [data?.items, processType]);

	const options: ComboboxOption[] = React.useMemo(() => {
		if (!filteredItems.length) return [];
		return filteredItems.map((item) => {
			const processLabel = item.processType
				? (PROCESS_TYPE_MAP[item.processType] ?? item.processType)
				: "";
			const label = processLabel
				? `${item.name} (${item.code}) · ${processLabel}`
				: `${item.name} (${item.code})`;
			return {
				value: valueKey === "id" ? item.id : item.code,
				label,
			};
		});
	}, [filteredItems, valueKey]);

	return (
		<Combobox
			options={options}
			value={value}
			onValueChange={onValueChange}
			placeholder={isLoading ? "加载中..." : placeholder}
			emptyText="未找到线体"
			disabled={disabled || isLoading}
			className={className}
		/>
	);
}
