import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { StencilCleaningRecord } from "@/hooks/use-stencil-cleaning";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatLine = (record: StencilCleaningRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const renderRunBadge = (runNo: string | null) => {
	if (!runNo) return <Badge variant="outline">无批次</Badge>;
	return <Badge variant="secondary">{runNo}</Badge>;
};

export const stencilCleaningFieldMeta: DataListFieldMeta<StencilCleaningRecord>[] = [
	{
		key: "stencilId",
		label: "钢网编号",
		cardPrimary: true,
		cardValue: (record) => record.stencilId,
	},
	{
		key: "runNo",
		label: "批次号",
		cardBadge: true,
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
		cardValue: (record) => renderRunBadge(record.runNo),
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
