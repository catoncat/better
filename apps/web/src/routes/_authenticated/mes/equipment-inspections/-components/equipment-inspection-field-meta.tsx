import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { EquipmentInspectionRecord } from "@/hooks/use-equipment-inspections";
import { INSPECTION_RESULT_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

const formatLine = (record: EquipmentInspectionRecord) => {
	if (record.lineCode && record.lineName) {
		return `${record.lineCode} / ${record.lineName}`;
	}
	return record.lineCode || record.lineName || "-";
};

const renderResultBadge = (result: string | null) => {
	if (!result) return <Badge variant="outline">未填写</Badge>;
	if (result === "PASS")
		return <Badge variant="secondary">{INSPECTION_RESULT_MAP[result] ?? result}</Badge>;
	if (result === "FAIL")
		return <Badge variant="destructive">{INSPECTION_RESULT_MAP[result] ?? result}</Badge>;
	return <Badge variant="outline">{result}</Badge>;
};

export const equipmentInspectionFieldMeta: DataListFieldMeta<EquipmentInspectionRecord>[] = [
	{
		key: "machineName",
		label: "设备名称",
		cardPrimary: true,
		cardValue: (record) => record.machineName,
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
		key: "result",
		label: "点检结果",
		cardBadge: true,
		accessorFn: (record) => record.result,
		tableCell: (record) => renderResultBadge(record.result),
		cardValue: (record) => renderResultBadge(record.result),
	},
	{
		key: "inspectedAt",
		label: "点检时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.inspectedAt),
		tableCell: (record) => formatOptionalDate(record.inspectedAt),
	},
	{
		key: "equipmentType",
		label: "设备类型",
		cardDetail: true,
		cardValue: (record) => record.equipmentType || "-",
	},
	{
		key: "sampleModel",
		label: "样板型号",
		cardDetail: true,
		cardValue: (record) => record.sampleModel || "-",
	},
	{
		key: "version",
		label: "版本",
		cardDetail: true,
		cardValue: (record) => record.version || "-",
	},
	{
		key: "programName",
		label: "程序名称",
		cardDetail: true,
		cardValue: (record) => record.programName || "-",
	},
	{
		key: "inspector",
		label: "点检人",
		cardDetail: true,
		cardValue: (record) => record.inspector,
	},
	{
		key: "remark",
		label: "备注",
		cardDetail: true,
		cardValue: (record) => record.remark || "-",
		tableHidden: true,
	},
];
