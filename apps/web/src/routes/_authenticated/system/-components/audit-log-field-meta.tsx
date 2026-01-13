import { format } from "date-fns";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { AuditLogItem } from "@/hooks/use-audit-logs";
import { AUDIT_ENTITY_TYPE_MAP, AUDIT_STATUS_MAP } from "@/lib/constants";

const formatTime = (value?: string | null) => {
	if (!value) return "-";
	return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
};

export const auditEntityTypeOptions = [
	{ label: "全部", value: "all" },
	...Object.entries(AUDIT_ENTITY_TYPE_MAP).map(([value, label]) => ({ label, value })),
];

export const auditStatusOptions = [
	{ label: "全部", value: "all" },
	{ label: AUDIT_STATUS_MAP.SUCCESS ?? "成功", value: "SUCCESS" },
	{ label: AUDIT_STATUS_MAP.FAIL ?? "失败", value: "FAIL" },
];

export const auditLogFieldMeta: DataListFieldMeta<AuditLogItem>[] = [
	{
		key: "createdAt",
		label: "时间",
		sortable: false,
		cardSecondary: true,
		cardValue: (item) => formatTime(item.createdAt),
		tableCell: (item) => (
			<span className="text-muted-foreground">{formatTime(item.createdAt)}</span>
		),
	},
	{
		key: "action",
		label: "Action",
		sortable: false,
		cardPrimary: true,
		cardValue: (item) => <span className="font-mono">{item.action}</span>,
		tableCell: (item) => <span className="font-mono text-xs">{item.action}</span>,
	},
	{
		key: "entityType",
		label: "实体",
		sortable: false,
		cardBadge: true,
		cardValue: (item) => (
			<Badge variant="outline">
				{AUDIT_ENTITY_TYPE_MAP[item.entityType] ?? String(item.entityType)}
			</Badge>
		),
		tableCell: (item) => (
			<Badge variant="secondary">
				{AUDIT_ENTITY_TYPE_MAP[item.entityType] ?? String(item.entityType)}
			</Badge>
		),
	},
	{
		key: "entityId",
		label: "实体 ID",
		sortable: false,
		cardDetail: true,
		cardValue: (item) => <span className="font-mono text-xs">{item.entityId}</span>,
		tableCell: (item) => <span className="font-mono text-xs">{item.entityId}</span>,
	},
	{
		key: "actorName",
		label: "操作者",
		sortable: false,
		cardDetail: true,
		cardValue: (item) => item.actorName || item.actorId || "-",
		tableCell: (item) => item.actorName || item.actorId || "-",
	},
	{
		key: "status",
		label: "结果",
		sortable: false,
		cardDetail: true,
		cardValue: (item) => (
			<Badge variant={item.status === "SUCCESS" ? "default" : "destructive"} title={item.status}>
				{AUDIT_STATUS_MAP[item.status] ?? item.status}
			</Badge>
		),
		tableCell: (item) => (
			<Badge variant={item.status === "SUCCESS" ? "default" : "destructive"} title={item.status}>
				{AUDIT_STATUS_MAP[item.status] ?? item.status}
			</Badge>
		),
	},
	{
		key: "errorMessage",
		label: "错误",
		sortable: false,
		tableHidden: true,
		cardDetail: true,
		cardLabel: "错误",
		cardValue: (item) =>
			item.errorMessage ? <span className="text-destructive">{item.errorMessage}</span> : null,
	},
];
