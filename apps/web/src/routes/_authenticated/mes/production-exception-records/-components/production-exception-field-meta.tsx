import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { ProductionExceptionRecord } from "@/hooks/use-production-exception-records";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatOptionalNumber = (value: number | null, suffix?: string) => {
	if (value === null || Number.isNaN(value)) return "-";
	return suffix ? `${value}${suffix}` : `${value}`;
};

const formatLine = (record: ProductionExceptionRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const formatPrimary = (record: ProductionExceptionRecord) => {
	if (record.jobNo) return record.jobNo;
	if (record.lineNo) return record.lineNo;
	return "生产异常";
};

export const productionExceptionFieldMeta: DataListFieldMeta<ProductionExceptionRecord>[] = [
	{
		key: "jobNo",
		label: "工单/任务号",
		cardPrimary: true,
		cardValue: (record) => formatPrimary(record),
	},
	{
		key: "description",
		label: "异常描述",
		cardSecondary: true,
		cardValue: (record) => record.description,
	},
	{
		key: "issuedAt",
		label: "发生时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.issuedAt),
		tableCell: (record) => formatOptionalDate(record.issuedAt),
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
		key: "customer",
		label: "客户",
		cardDetail: true,
		cardValue: (record) => record.customer || "-",
	},
	{
		key: "qty",
		label: "数量",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.qty),
		tableCell: (record) => formatOptionalNumber(record.qty),
	},
	{
		key: "downtimeMinutes",
		label: "停机(分钟)",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.downtimeMinutes, "min"),
		tableCell: (record) => formatOptionalNumber(record.downtimeMinutes, "min"),
	},
	{
		key: "impact",
		label: "影响",
		cardDetail: true,
		cardValue: (record) => record.impact || "-",
	},
	{
		key: "issuedBy",
		label: "报告人",
		cardDetail: true,
		cardValue: (record) => record.issuedBy,
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
