import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { BakeRecord } from "@/hooks/use-bake-records";
import { formatDateTime } from "@/lib/utils";

const formatTemperature = (value: number | null) => {
	if (value === null || Number.isNaN(value)) return "-";
	return `${value}℃`;
};

const formatMaterialLot = (record: BakeRecord) => {
	if (record.materialCode && record.lotNo) {
		return `${record.materialCode} / ${record.lotNo}`;
	}
	return record.materialCode || record.lotNo || "-";
};

const renderRunBadge = (runNo: string | null) => {
	if (!runNo) {
		return <Badge variant="outline">无批次</Badge>;
	}
	return <Badge variant="secondary">{runNo}</Badge>;
};

export const bakeRecordFieldMeta: DataListFieldMeta<BakeRecord>[] = [
	{
		key: "itemCode",
		label: "产品/物料 P/N",
		cardPrimary: true,
		cardValue: (record) => record.itemCode,
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
		key: "bakeProcess",
		label: "烘烤工序",
		cardSecondary: true,
		cardValue: (record) => record.bakeProcess,
	},
	{
		key: "bakeQty",
		label: "烘烤数量",
		cardDetail: true,
		cardValue: (record) => record.bakeQty,
	},
	{
		key: "bakeTemperature",
		label: "烘烤温度",
		cardDetail: true,
		cardValue: (record) => formatTemperature(record.bakeTemperature),
		tableCell: (record) => formatTemperature(record.bakeTemperature),
	},
	{
		key: "durationHours",
		label: "时长(小时)",
		cardDetail: true,
		cardValue: (record) => record.durationHours || "-",
	},
	{
		key: "inAt",
		label: "放入时间",
		cardDetail: true,
		cardValue: (record) => formatDateTime(record.inAt),
		tableCell: (record) => formatDateTime(record.inAt),
	},
	{
		key: "outAt",
		label: "取出时间",
		cardDetail: true,
		cardValue: (record) => formatDateTime(record.outAt),
		tableCell: (record) => formatDateTime(record.outAt),
	},
	{
		key: "inBy",
		label: "放入负责人",
		cardDetail: true,
		cardValue: (record) => record.inBy,
	},
	{
		key: "outBy",
		label: "取出负责人",
		cardDetail: true,
		cardValue: (record) => record.outBy,
	},
	{
		key: "confirmedBy",
		label: "确认人",
		cardDetail: true,
		cardValue: (record) => record.confirmedBy || "-",
	},
	{
		key: "materialLot",
		label: "物料批次",
		cardDetail: true,
		accessorFn: (record) => formatMaterialLot(record),
		tableCell: (record) => formatMaterialLot(record),
		cardValue: (record) => formatMaterialLot(record),
	},
];
