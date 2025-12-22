"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInstrumentDepartments } from "@/hooks/use-instrument-departments";

interface DataTableToolbarProps<TData> {
	table: Table<TData>;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	calibrationTypeFilter: string[];
	setCalibrationTypeFilter: (value: string[]) => void;
	departmentFilter: string[];
	setDepartmentFilter: (value: string[]) => void;
	onReset: () => void;
	actions?: React.ReactNode;
}

const calibrationTypeOptions = [
	{ label: "内校", value: "internal" },
	{ label: "外校", value: "external" },
];

export function DataTableToolbar<TData>({
	table,
	searchTerm,
	setSearchTerm,
	calibrationTypeFilter,
	setCalibrationTypeFilter,
	departmentFilter,
	setDepartmentFilter,
	onReset,
	actions,
}: DataTableToolbarProps<TData>) {
	const { data: departments } = useInstrumentDepartments();
	const departmentOptions =
		departments?.map((d: string) => ({
			label: d,
			value: d,
		})) || [];

	const isFiltered =
		searchTerm !== "" || calibrationTypeFilter.length > 0 || departmentFilter.length > 0;

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-1 items-center space-x-2">
				<Input
					placeholder="搜索编号、名称或型号..."
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					className="h-8 w-[150px] lg:w-[250px]"
				/>
				<DataTableFacetedFilter
					title="计量方式"
					options={calibrationTypeOptions}
					value={calibrationTypeFilter}
					onChange={setCalibrationTypeFilter}
				/>
				<DataTableFacetedFilter
					title="部门"
					options={departmentOptions}
					value={departmentFilter}
					onChange={setDepartmentFilter}
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
