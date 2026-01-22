import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { OvenProgramRecord } from "@/hooks/use-oven-program-records";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatLine = (record: OvenProgramRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

export const ovenProgramFieldMeta: DataListFieldMeta<OvenProgramRecord>[] = [
	{
		key: "programName",
		label: "炉温程式",
		cardPrimary: true,
		cardValue: (record) => record.programName,
	},
	{
		key: "productName",
		label: "产品名称",
		cardSecondary: true,
		cardValue: (record) => record.productName,
	},
	{
		key: "lineCode",
		label: "产线",
		cardDetail: true,
		accessorFn: (record) => formatLine(record),
		tableCell: (record) => formatLine(record),
		cardValue: (record) => formatLine(record),
	},
	{
		key: "recordDate",
		label: "使用时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.recordDate),
		tableCell: (record) => formatOptionalDate(record.recordDate),
	},
	{
		key: "equipmentId",
		label: "设备编号",
		cardDetail: true,
		cardValue: (record) => record.equipmentId || "-",
	},
	{
		key: "usedBy",
		label: "使用人",
		cardDetail: true,
		cardValue: (record) => record.usedBy,
	},
	{
		key: "confirmedBy",
		label: "确认人",
		cardDetail: true,
		cardValue: (record) => record.confirmedBy || "-",
	},
	{
		key: "remark",
		label: "备注",
		cardDetail: true,
		cardValue: (record) => record.remark || "-",
		tableHidden: true,
	},
];
