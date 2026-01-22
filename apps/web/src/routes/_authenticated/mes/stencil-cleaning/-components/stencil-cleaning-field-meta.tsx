import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { StencilCleaningRecord } from "@/hooks/use-stencil-cleaning";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatLine = (record: StencilCleaningRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

export const stencilCleaningFieldMeta: DataListFieldMeta<StencilCleaningRecord>[] = [
	{
		key: "stencilId",
		label: "钢网编号",
		cardPrimary: true,
		cardValue: (record) => record.stencilId,
	},
	{
		key: "lineCode",
		label: "产线",
		cardSecondary: true,
		accessorFn: (record) => formatLine(record),
		tableCell: (record) => formatLine(record),
		cardValue: (record) => formatLine(record),
	},
	{
		key: "cleanedAt",
		label: "清洗时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.cleanedAt),
		tableCell: (record) => formatOptionalDate(record.cleanedAt),
	},
	{
		key: "cleanedBy",
		label: "清洗人",
		cardDetail: true,
		cardValue: (record) => record.cleanedBy,
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
