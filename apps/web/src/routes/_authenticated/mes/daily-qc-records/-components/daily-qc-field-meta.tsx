import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { DailyQcRecord } from "@/hooks/use-daily-qc-records";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatOptionalNumber = (value: number | null) => {
	if (value === null || Number.isNaN(value)) return "-";
	return `${value}`;
};

const formatLine = (record: DailyQcRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const formatPrimary = (record: DailyQcRecord) => {
	if (record.jobNo) return record.jobNo;
	if (record.station) return record.station;
	return "日常QC";
};

export const dailyQcFieldMeta: DataListFieldMeta<DailyQcRecord>[] = [
	{
		key: "jobNo",
		label: "工单/任务号",
		cardPrimary: true,
		cardValue: (record) => formatPrimary(record),
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
		key: "inspectedAt",
		label: "检验时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.inspectedAt),
		tableCell: (record) => formatOptionalDate(record.inspectedAt),
	},
	{
		key: "customer",
		label: "客户",
		cardDetail: true,
		cardValue: (record) => record.customer || "-",
	},
	{
		key: "station",
		label: "工序",
		cardDetail: true,
		cardValue: (record) => record.station || "-",
	},
	{
		key: "shiftCode",
		label: "班次",
		cardDetail: true,
		cardValue: (record) => record.shiftCode || "-",
	},
	{
		key: "timeWindow",
		label: "时间段",
		cardDetail: true,
		cardValue: (record) => record.timeWindow || "-",
	},
	{
		key: "totalParts",
		label: "生产数量",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.totalParts),
		tableCell: (record) => formatOptionalNumber(record.totalParts),
	},
	{
		key: "inspectedQty",
		label: "检验数量",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.inspectedQty),
		tableCell: (record) => formatOptionalNumber(record.inspectedQty),
	},
	{
		key: "defectBoardQty",
		label: "不良板数",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.defectBoardQty),
		tableCell: (record) => formatOptionalNumber(record.defectBoardQty),
	},
	{
		key: "defectBoardRate",
		label: "不良板率",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.defectBoardRate),
		tableCell: (record) => formatOptionalNumber(record.defectBoardRate),
	},
	{
		key: "defectQty",
		label: "不良点数",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.defectQty),
		tableCell: (record) => formatOptionalNumber(record.defectQty),
	},
	{
		key: "defectRate",
		label: "不良率",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.defectRate),
		tableCell: (record) => formatOptionalNumber(record.defectRate),
	},
	{
		key: "inspectedBy",
		label: "检验人",
		cardDetail: true,
		cardValue: (record) => record.inspectedBy,
	},
	{
		key: "reviewedBy",
		label: "复核人",
		cardDetail: true,
		cardValue: (record) => record.reviewedBy || "-",
	},
	{
		key: "remark",
		label: "备注",
		cardDetail: true,
		cardValue: (record) => record.remark || "-",
		tableHidden: true,
	},
];
