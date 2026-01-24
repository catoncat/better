import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import type { TimeRuleDefinition } from "@/hooks/use-time-rules";

export const timeRuleFieldMeta: DataListFieldMeta<TimeRuleDefinition>[] = [
	{
		key: "code",
		label: "规则代码",
		sortable: true,
	},
	{
		key: "name",
		label: "规则名称",
		sortable: true,
	},
	{
		key: "ruleType",
		label: "类型",
		sortable: true,
		tableCell: (item) => (item.ruleType === "SOLDER_PASTE_EXPOSURE" ? "锡膏暴露" : "水洗时限"),
	},
	{
		key: "durationMinutes",
		label: "时限",
		sortable: true,
		tableCell: (item) =>
			`${item.durationMinutes} min (${(item.durationMinutes / 60).toFixed(1)} h)`,
	},
	{
		key: "warningMinutes",
		label: "预警",
		sortable: true,
		tableCell: (item) => (item.warningMinutes ? `${item.warningMinutes} min` : "-"),
	},
	{
		key: "scope",
		label: "范围",
		sortable: true,
	},
	{
		key: "isActive",
		label: "状态",
		sortable: true,
	},
];
