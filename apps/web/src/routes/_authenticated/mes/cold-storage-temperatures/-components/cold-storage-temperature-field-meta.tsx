import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { ColdStorageTemperatureRecord } from "@/hooks/use-cold-storage-temperatures";
import { formatDateTime } from "@/lib/utils";

const formatTemperature = (value: number) => `${value}℃`;

export const coldStorageTemperatureFieldMeta: DataListFieldMeta<ColdStorageTemperatureRecord>[] = [
	{
		key: "temperature",
		label: "温度",
		cardPrimary: true,
		cardValue: (record) => formatTemperature(record.temperature),
		tableCell: (record) => formatTemperature(record.temperature),
	},
	{
		key: "measuredAt",
		label: "测量时间",
		cardSecondary: true,
		cardValue: (record) => formatDateTime(record.measuredAt),
		tableCell: (record) => formatDateTime(record.measuredAt),
	},
	{
		key: "measuredBy",
		label: "测量人员",
		cardDetail: true,
		cardValue: (record) => record.measuredBy,
		tableCell: (record) => record.measuredBy,
	},
	{
		key: "reviewedBy",
		label: "复核人员",
		cardDetail: true,
		cardValue: (record) => record.reviewedBy || "-",
		tableCell: (record) => record.reviewedBy || "-",
	},
	{
		key: "remark",
		label: "备注",
		cardDetail: true,
		cardValue: (record) => record.remark || "-",
		tableCell: (record) => record.remark || "-",
	},
];
