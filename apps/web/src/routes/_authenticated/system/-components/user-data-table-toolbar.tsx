"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_ROLE_MAP } from "@/lib/constants";

interface UserDataTableToolbarProps<TData> {
	table: Table<TData>;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	roleFilter: string[];
	setRoleFilter: (value: string[]) => void;
	roles: string[];
	onReset: () => void;
	actions?: React.ReactNode;
}

export function UserDataTableToolbar<TData>({
	table,
	searchTerm,
	setSearchTerm,
	roleFilter,
	setRoleFilter,
	roles,
	onReset,
	actions,
}: UserDataTableToolbarProps<TData>) {
	const isFiltered = searchTerm !== "" || roleFilter.length > 0;

	const roleOptions = roles.map((role) => ({
		label: USER_ROLE_MAP[role] || role,
		value: role,
	}));

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-1 items-center space-x-2">
				<Input
					placeholder="搜索姓名、邮箱或用户名"
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					className="h-8 w-[150px] lg:w-[250px]"
				/>
				<DataTableFacetedFilter
					title="角色"
					options={roleOptions}
					value={roleFilter}
					onChange={(values) => {
						setRoleFilter(values || []);
					}}
				/>
				{isFiltered && (
					<Button variant="ghost" onClick={onReset} className="h-8 px-2 lg:px-3">
						重置
						<X className="ml-2 h-4 w-4" />
					</Button>
				)}
			</div>
			<div className="flex items-center space-x-2">
				<DataTableViewOptions table={table} />
				{actions}
			</div>
		</div>
	);
}
