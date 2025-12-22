"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Copy, Eye, Pencil, Plus } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Badge } from "@/components/ui/badge";
import type { Instrument } from "@/hooks/use-instruments";

type InstrumentTableMeta = {
	onEdit?: (instrument: Instrument) => void;
	onViewCalibrations?: (instrumentId: string) => void;
	onCreateCalibration?: (instrumentId: string) => void;
};

export const columns: ColumnDef<Instrument>[] = [
	{
		accessorKey: "instrumentNo",
		header: "仪器编号",
	},
	{
		accessorKey: "description",
		header: "仪器名称",
	},
	{
		accessorKey: "model",
		header: "型号规格",
	},
	{
		accessorKey: "calibrationType",
		header: "计量方式",
		cell: ({ row }) => {
			const type = row.getValue("calibrationType") as string;
			return (
				<Badge variant={type === "internal" ? "secondary" : "default"}>
					{type === "internal" ? "内校" : "外校"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "department",
		header: "使用部门",
	},
	{
		id: "ownerName",
		accessorFn: (row) => row.owner?.name,
		header: "责任人",
	},
	{
		accessorKey: "lastCalibrationDate",
		header: "上次计量",
		cell: ({ row }) => {
			const date = row.getValue("lastCalibrationDate") as string;
			return date ? format(new Date(date), "yyyy-MM-dd") : "-";
		},
	},
	{
		accessorKey: "intervalDays",
		header: "周期(天)",
	},
	{
		accessorKey: "nextCalibrationDate",
		header: "下次计量",
		cell: ({ row }) => {
			const date = row.getValue("nextCalibrationDate") as string;
			return date ? format(new Date(date), "yyyy-MM-dd") : "-";
		},
	},
	{
		id: "actions",
		cell: ({ row, table }) => {
			const instrument = row.original;
			const meta = table.options.meta as InstrumentTableMeta | undefined;

			return (
				<TableActions
					actions={[
						{
							icon: Pencil,
							label: "编辑",
							onClick: () => meta?.onEdit?.(instrument),
						},
						{
							icon: Eye,
							label: "查看校准记录",
							onClick: () => meta?.onViewCalibrations?.(instrument.id),
						},
						{
							icon: Plus,
							label: "新增记录",
							onClick: () => meta?.onCreateCalibration?.(instrument.id),
						},
						{
							icon: Copy,
							label: "复制 ID",
							onClick: () => navigator.clipboard.writeText(instrument.id),
						},
					]}
				/>
			);
		},
	},
];
