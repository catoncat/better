import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { SolderPasteUsageRecord } from "@/hooks/use-solder-paste-usage";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatLine = (record: SolderPasteUsageRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const formatReceivedQty = (value: number | null) => {
	if (value === null || Number.isNaN(value)) return "-";
	return `${value} 瓶`;
};

const renderReturnBadge = (value: boolean | null) => {
	if (value === true) return <Badge variant="secondary">已回收</Badge>;
	if (value === false) return <Badge variant="outline">未回收</Badge>;
	return <Badge variant="outline">未填写</Badge>;
};

export const solderPasteUsageFieldMeta: DataListFieldMeta<SolderPasteUsageRecord>[] = [
	{
		key: "lotId",
		label: "锡膏批次",
		cardPrimary: true,
		cardValue: (record) => record.lotId,
	},
	{
		key: "runNo",
		label: "批次号",
		cardDetail: true,
		accessorFn: (record) => record.runNo,
		tableCell: (record) =>
			record.runNo ? (
				<Link
					to="/mes/runs/$runNo"
					params={{ runNo: record.runNo }}
					className="font-medium text-primary hover:underline"
				>
					{record.runNo}
				</Link>
			) : (
				"-"
			),
		cardValue: (record) => record.runNo || "-",
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
		key: "isReturned",
		label: "回收状态",
		cardBadge: true,
		accessorFn: (record) => record.isReturned,
		tableCell: (record) => renderReturnBadge(record.isReturned),
		cardValue: (record) => renderReturnBadge(record.isReturned),
	},
	{
		key: "receivedAt",
		label: "收料时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.receivedAt),
		tableCell: (record) => formatOptionalDate(record.receivedAt),
	},
	{
		key: "expiresAt",
		label: "有效期",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.expiresAt),
		tableCell: (record) => formatOptionalDate(record.expiresAt),
	},
	{
		key: "receivedQty",
		label: "收料数量",
		cardDetail: true,
		cardValue: (record) => formatReceivedQty(record.receivedQty),
		tableCell: (record) => formatReceivedQty(record.receivedQty),
	},
	{
		key: "thawedAt",
		label: "解冻时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.thawedAt),
		tableCell: (record) => formatOptionalDate(record.thawedAt),
	},
	{
		key: "issuedAt",
		label: "领用时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.issuedAt),
		tableCell: (record) => formatOptionalDate(record.issuedAt),
	},
	{
		key: "returnedAt",
		label: "回收时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.returnedAt),
		tableCell: (record) => formatOptionalDate(record.returnedAt),
	},
	{
		key: "usedBy",
		label: "使用人",
		cardDetail: true,
		cardValue: (record) => record.usedBy || "-",
		tableCell: (record) => record.usedBy || "-",
	},
	{
		key: "remark",
		label: "备注",
		cardDetail: true,
		cardValue: (record) => record.remark || "-",
		tableCell: (record) => record.remark || "-",
	},
];
