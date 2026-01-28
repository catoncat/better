import { format } from "date-fns";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { FaiTemplateSummary } from "@/hooks/use-fai-templates";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

const getActiveBadge = (isActive: boolean) => (
	<Badge variant={isActive ? "default" : "outline"}>{isActive ? "启用" : "停用"}</Badge>
);

const getProcessBadge = (processType: string) => (
	<Badge variant="secondary">{PROCESS_TYPE_MAP[processType as "SMT" | "DIP"] ?? processType}</Badge>
);

export const faiTemplateFieldMeta: DataListFieldMeta<FaiTemplateSummary>[] = [
	{
		key: "name",
		label: "模板名称",
		cardPrimary: true,
		tableCell: (template) => <span className="font-medium">{template.name}</span>,
		cardValue: (template) => <span className="font-medium">{template.name}</span>,
	},
	{
		key: "code",
		label: "模板编码",
		cardSecondary: true,
		tableCell: (template) => template.code,
		cardValue: (template) => template.code,
	},
	{
		key: "productCode",
		label: "产品型号",
		cardSecondary: true,
		tableCell: (template) => template.productCode,
		cardValue: (template) => template.productCode,
	},
	{
		key: "processType",
		label: "工艺类型",
		cardBadge: true,
		tableCell: (template) => getProcessBadge(template.processType),
		cardValue: (template) => getProcessBadge(template.processType),
	},
	{
		key: "version",
		label: "版本",
		cardDetail: true,
		tableCell: (template) => template.version ?? "-",
		cardValue: (template) => template.version ?? "-",
	},
	{
		key: "itemCount",
		label: "检验项",
		cardDetail: true,
		tableCell: (template) => `${template.itemCount} 项`,
		cardValue: (template) => `${template.itemCount} 项`,
	},
	{
		key: "isActive",
		label: "状态",
		cardBadge: true,
		tableCell: (template) => getActiveBadge(template.isActive),
		cardValue: (template) => getActiveBadge(template.isActive),
	},
	{
		key: "updatedAt",
		label: "更新时间",
		cardDetail: true,
		tableCell: (template) => format(new Date(template.updatedAt), "yyyy-MM-dd HH:mm"),
		cardValue: (template) => format(new Date(template.updatedAt), "yyyy-MM-dd HH:mm"),
	},
];

export { getActiveBadge, getProcessBadge };
