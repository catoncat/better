import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useRouteSearch } from "@/hooks/use-routes";

interface RouteSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	enabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function RouteSelect({
	value,
	onValueChange,
	disabled,
	enabled,
	placeholder = "选择路由",
	className,
}: RouteSelectProps) {
	const [searchValue, setSearchValue] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");

	React.useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 250);
		return () => window.clearTimeout(timer);
	}, [searchValue]);

	const { data, isLoading } = useRouteSearch(debouncedSearch, {
		enabled: enabled ?? !disabled,
	});

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
			placeholder={placeholder}
			searchPlaceholder="搜索路由编码或名称..."
			emptyText={isLoading ? "加载中..." : "未找到路由"}
			disabled={disabled}
			className={className}
			searchValue={searchValue}
			onSearchValueChange={setSearchValue}
		/>
	);
}
