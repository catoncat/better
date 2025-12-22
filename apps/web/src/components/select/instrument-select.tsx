import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { type Instrument, useInstrumentList } from "@/hooks/use-instruments";

interface InstrumentSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}
export function InstrumentSelect({
	value,
	onValueChange,
	disabled,
	placeholder = "选择仪器",
	className,
}: InstrumentSelectProps) {
	// Same as EquipmentSelect: fetch a reasonable amount for client-side search.
	const { data, isLoading } = useInstrumentList({
		page: 1,
		pageSize: 100,
	});

	const options: ComboboxOption[] = React.useMemo(() => {
		if (!data?.items) return [];
		return data.items.map((item: Instrument) => {
			const name = item.description?.trim();
			return {
				value: item.id,
				label: name ? `${name} (${item.instrumentNo})` : item.instrumentNo,
			};
		});
	}, [data?.items]);

	return (
		<Combobox
			options={options}
			value={value}
			onValueChange={onValueChange}
			placeholder={isLoading ? "加载中..." : placeholder}
			emptyText="未找到仪器"
			disabled={disabled || isLoading}
			className={className}
		/>
	);
}
