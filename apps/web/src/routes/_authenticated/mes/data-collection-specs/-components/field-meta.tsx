import { format } from "date-fns";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { DataCollectionSpec } from "@/hooks/use-data-collection-specs";

// Status labels and badges
const ITEM_TYPE_MAP: Record<string, { label: string; variant: "default" | "secondary" }> = {
	KEY: { label: "关键", variant: "default" },
	OBSERVATION: { label: "观察", variant: "secondary" },
};

const DATA_TYPE_MAP: Record<string, string> = {
	NUMBER: "数值",
	TEXT: "文本",
	BOOLEAN: "布尔",
	JSON: "JSON",
};

const METHOD_MAP: Record<string, string> = {
	AUTO: "自动",
	MANUAL: "手动",
};

const TRIGGER_TYPE_MAP: Record<string, string> = {
	EVENT: "事件触发",
	TIME: "时间触发",
	EACH_UNIT: "每单元",
	EACH_CARRIER: "每载具",
};

export const getItemTypeBadge = (itemType: string) => {
	const config = ITEM_TYPE_MAP[itemType] ?? { label: itemType, variant: "secondary" as const };
	return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const getActiveBadge = (isActive: boolean) => {
	return <Badge variant={isActive ? "default" : "outline"}>{isActive ? "启用" : "停用"}</Badge>;
};

export const dcSpecFieldMeta: DataListFieldMeta<DataCollectionSpec>[] = [
	{
		key: "name",
		label: "采集项名称",
		sortable: true,
		cardPrimary: true,
		tableCell: (spec) => <span className="font-medium">{spec.name}</span>,
		cardValue: (spec) => <span className="font-medium">{spec.name}</span>,
	},
	{
		key: "operationCode",
		label: "工序",
		sortable: false,
		cardSecondary: true,
		tableCell: (spec) => <span title={spec.operationName}>{spec.operationCode}</span>,
		cardValue: (spec) => `${spec.operationCode} - ${spec.operationName}`,
	},
	{
		key: "itemType",
		label: "类型",
		sortable: false,
		cardBadge: true,
		tableCell: (spec) => getItemTypeBadge(spec.itemType),
		cardValue: (spec) => getItemTypeBadge(spec.itemType),
	},
	{
		key: "dataType",
		label: "数据类型",
		sortable: false,
		cardDetail: true,
		tableCell: (spec) => DATA_TYPE_MAP[spec.dataType] ?? spec.dataType,
		cardValue: (spec) => DATA_TYPE_MAP[spec.dataType] ?? spec.dataType,
	},
	{
		key: "method",
		label: "采集方式",
		sortable: false,
		cardDetail: true,
		tableCell: (spec) => METHOD_MAP[spec.method] ?? spec.method,
		cardValue: (spec) => METHOD_MAP[spec.method] ?? spec.method,
	},
	{
		key: "triggerType",
		label: "触发方式",
		sortable: false,
		cardDetail: true,
		tableCell: (spec) => TRIGGER_TYPE_MAP[spec.triggerType] ?? spec.triggerType,
		cardValue: (spec) => TRIGGER_TYPE_MAP[spec.triggerType] ?? spec.triggerType,
	},
	{
		key: "isRequired",
		label: "必填",
		sortable: false,
		tableCell: (spec) => (spec.isRequired ? "是" : "否"),
		cardValue: (spec) => (spec.isRequired ? "必填" : "可选"),
	},
	{
		key: "isActive",
		label: "状态",
		sortable: false,
		cardBadge: true,
		tableCell: (spec) => getActiveBadge(spec.isActive),
		cardValue: (spec) => getActiveBadge(spec.isActive),
	},
	{
		key: "updatedAt",
		label: "更新时间",
		sortable: true,
		cardDetail: true,
		tableCell: (spec) => format(new Date(spec.updatedAt), "yyyy-MM-dd HH:mm"),
		cardValue: (spec) => format(new Date(spec.updatedAt), "yyyy-MM-dd HH:mm"),
	},
];

// Export constants for use in other components
export { ITEM_TYPE_MAP, DATA_TYPE_MAP, METHOD_MAP, TRIGGER_TYPE_MAP };
