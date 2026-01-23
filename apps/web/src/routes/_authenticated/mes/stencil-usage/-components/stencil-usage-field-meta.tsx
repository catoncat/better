import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { StencilUsageRecord } from "@/hooks/use-stencil-usage";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatOptionalNumber = (value: number | null, suffix?: string) => {
	if (value === null || Number.isNaN(value)) return "-";
	return suffix ? `${value}${suffix}` : `${value}`;
};

const formatLine = (record: StencilUsageRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const renderCheckBadge = (value: boolean | null) => {
	if (value === null) return <Badge variant="outline">未填写</Badge>;
	return value ? (
		<Badge variant="secondary">通过</Badge>
	) : (
		<Badge variant="destructive">异常</Badge>
	);
};

const renderRunBadge = (runNo: string | null) => {
	if (!runNo) return <Badge variant="outline">无批次</Badge>;
	return <Badge variant="secondary">{runNo}</Badge>;
};

export const stencilUsageFieldMeta: DataListFieldMeta<StencilUsageRecord>[] = [
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
		key: "recordDate",
		label: "记录时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.recordDate),
		tableCell: (record) => formatOptionalDate(record.recordDate),
	},
	{
		key: "productModel",
		label: "产品型号",
		cardDetail: true,
		cardValue: (record) => record.productModel || "-",
	},
	{
		key: "stencilThickness",
		label: "钢网厚度",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.stencilThickness, "mm"),
		tableCell: (record) => formatOptionalNumber(record.stencilThickness, "mm"),
	},
	{
		key: "printCount",
		label: "本次印刷",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.printCount, "次"),
		tableCell: (record) => formatOptionalNumber(record.printCount, "次"),
	},
	{
		key: "totalPrintCount",
		label: "累计印刷",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.totalPrintCount, "次"),
		tableCell: (record) => formatOptionalNumber(record.totalPrintCount, "次"),
	},
	{
		key: "lifeLimit",
		label: "寿命上限",
		cardDetail: true,
		cardValue: (record) => formatOptionalNumber(record.lifeLimit, "次"),
		tableCell: (record) => formatOptionalNumber(record.lifeLimit, "次"),
	},
	{
		key: "replacedAt",
		label: "更换时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.replacedAt),
		tableCell: (record) => formatOptionalDate(record.replacedAt),
	},
	{
		key: "checkDeform",
		label: "变形检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkDeform),
		tableHidden: true,
	},
	{
		key: "checkHoleDamage",
		label: "破损检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkHoleDamage),
		tableHidden: true,
	},
	{
		key: "checkSealIntact",
		label: "密封检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkSealIntact),
		tableHidden: true,
	},
	{
		key: "usedBy",
		label: "使用人",
		cardDetail: true,
		cardValue: (record) => record.usedBy || "-",
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
