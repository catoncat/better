import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useLines } from "@/hooks/use-lines";

interface LineSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function LineSelect({
	value,
	onValueChange,
	disabled,
	placeholder = "选择线体",
	className,
}: LineSelectProps) {
	const { data, isLoading } = useLines();

	const options: ComboboxOption[] = React.useMemo(() => {
		if (!data?.items) return [];
		return data.items.map((item) => ({
			value: item.code,
			label: `${item.name} (${item.code})`,
		}));
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
