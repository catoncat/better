import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { MaintenanceRecord } from "@/hooks/use-maintenance";
import { formatDateTime } from "@/lib/utils";

// 实体类型标签
export const MAINTENANCE_ENTITY_TYPE_LABELS: Record<string, string> = {
	FIXTURE: "夹具",
	STENCIL: "钢网",
	SQUEEGEE: "刮刀",
	EQUIPMENT: "设备",
};

// 维修类型标签
export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
	REPAIR: "维修",
	CALIBRATION: "校准",
	CLEANING: "清洁",
	REPLACEMENT: "更换部件",
	INSPECTION: "检查",
};

// 状态标签
export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
	PENDING: "待处理",
	IN_PROGRESS: "进行中",
	COMPLETED: "已完成",
	CANCELLED: "已取消",
};

// 状态颜色
export const MAINTENANCE_STATUS_COLORS: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	IN_PROGRESS: "secondary",
	COMPLETED: "default",
	CANCELLED: "destructive",
};

const formatOptionalDate = (value: string | null) => (value ? formatDateTime(value) : "-");

export const maintenanceFieldMeta: DataListFieldMeta<MaintenanceRecord>[] = [
	{
		key: "entityDisplay",
		label: "实体",
		cardPrimary: true,
		cardValue: (record) => record.entityDisplay || record.entityId,
		accessorFn: (record) => record.entityDisplay || record.entityId,
	},
	{
		key: "entityType",
		label: "实体类型",
		cardSecondary: true,
		cardValue: (record) => MAINTENANCE_ENTITY_TYPE_LABELS[record.entityType] || record.entityType,
		tableCell: (record) => MAINTENANCE_ENTITY_TYPE_LABELS[record.entityType] || record.entityType,
	},
	{
		key: "maintenanceType",
		label: "维修类型",
		cardDetail: true,
		cardValue: (record) =>
			MAINTENANCE_TYPE_LABELS[record.maintenanceType] || record.maintenanceType,
		tableCell: (record) =>
			MAINTENANCE_TYPE_LABELS[record.maintenanceType] || record.maintenanceType,
	},
	{
		key: "status",
		label: "状态",
		cardDetail: true,
		cardValue: (record) => MAINTENANCE_STATUS_LABELS[record.status] || record.status,
		tableCell: (record) => (
			<Badge variant={MAINTENANCE_STATUS_COLORS[record.status] || "outline"}>
				{MAINTENANCE_STATUS_LABELS[record.status] || record.status}
			</Badge>
		),
	},
	{
		key: "description",
		label: "问题描述",
		cardDetail: true,
		cardValue: (record) => record.description,
	},
	{
		key: "reportedAt",
		label: "报修时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.reportedAt),
		tableCell: (record) => formatOptionalDate(record.reportedAt),
	},
	{
		key: "reportedBy",
		label: "报修人",
		cardDetail: true,
		cardValue: (record) => record.reportedBy,
	},
	{
		key: "completedAt",
		label: "完成时间",
		cardDetail: true,
		cardValue: (record) => formatOptionalDate(record.completedAt),
		tableCell: (record) => formatOptionalDate(record.completedAt),
		tableHidden: true,
	},
];
