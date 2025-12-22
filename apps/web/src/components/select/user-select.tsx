import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { type UserItem, useUserList } from "@/hooks/use-users";

interface UserSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
	filterRole?: string | string[];
	className?: string;
}

export function UserSelect({
	value,
	onValueChange,
	disabled,
	placeholder = "选择用户",
	filterRole,
	className,
}: UserSelectProps) {
	const { data, isLoading } = useUserList({
		page: 1,
		pageSize: 100,
		role: filterRole,
	});

	const options: ComboboxOption[] = React.useMemo(() => {
		if (!data?.items) return [];
		return data.items.map((item: UserItem) => ({
			value: item.id,
			label: `${item.name} (${item.email})`,
		}));
	}, [data?.items]);

	return (
		<Combobox
			options={options}
			value={value}
			onValueChange={onValueChange}
			placeholder={isLoading ? "加载中..." : placeholder}
			emptyText="未找到用户"
			disabled={disabled || isLoading}
			className={className}
		/>
	);
}
