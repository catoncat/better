import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useLines } from "@/hooks/use-lines";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

interface LineSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	enabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function LineSelect({
	value,
	onValueChange,
	disabled,
	enabled,
	placeholder = "选择线体",
	className,
}: LineSelectProps) {
	const { data, isLoading } = useLines({ enabled: enabled ?? !disabled });

	const options: ComboboxOption[] = React.useMemo(() => {
		if (!data?.items) return [];
		return data.items.map((item) => {
			const processLabel = item.processType
				? (PROCESS_TYPE_MAP[item.processType] ?? item.processType)
				: "";
			const label = processLabel
				? `${item.name} (${item.code}) · ${processLabel}`
				: `${item.name} (${item.code})`;
			return {
				value: item.code,
				label,
			};
		});
	}, [data?.items]);

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
