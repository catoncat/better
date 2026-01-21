import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { SqueegeeUsageRecord } from "@/hooks/use-squeegee-usage";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatOptionalNumber = (value: number | null, suffix?: string) => {
	if (value === null || Number.isNaN(value)) return "-";
	return suffix ? `${value}${suffix}` : `${value}`;
};

const formatLine = (record: SqueegeeUsageRecord) => {
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

export const squeegeeUsageFieldMeta: DataListFieldMeta<SqueegeeUsageRecord>[] = [
	{
		key: "squeegeeId",
		label: "刮刀编号",
		cardPrimary: true,
		cardValue: (record) => record.squeegeeId,
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
		key: "squeegeeSpec",
		label: "刮刀规格",
		cardDetail: true,
		cardValue: (record) => record.squeegeeSpec || "-",
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
		key: "checkSurface",
		label: "表面检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkSurface),
		tableHidden: true,
	},
	{
		key: "checkEdge",
		label: "刀口检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkEdge),
		tableHidden: true,
	},
	{
		key: "checkFlatness",
		label: "平整度检查",
		cardDetail: true,
		cardValue: (record) => renderCheckBadge(record.checkFlatness),
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
