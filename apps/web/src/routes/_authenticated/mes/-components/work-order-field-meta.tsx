import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { WorkOrder } from "@/hooks/use-work-orders";
import { WORK_ORDER_STATUS_MAP } from "@/lib/constants";

type WorkOrderErpMeta = {
	workshopCode?: string;
	workshopName?: string;
	routingName?: string;
	productName?: string;
	productSpec?: string;
};

const getErpMeta = (wo: WorkOrder): WorkOrderErpMeta => {
	const meta = (wo as { meta?: unknown }).meta;
	if (!meta || typeof meta !== "object") return {};
	const erp = (meta as { erp?: unknown }).erp;
	if (!erp || typeof erp !== "object") return {};
	return erp as WorkOrderErpMeta;
};

const getProductDetail = (meta: WorkOrderErpMeta) => {
	const parts = [meta.productName, meta.productSpec].filter(Boolean);
	return parts.length > 0 ? parts.join(" · ") : "";
};

const getWorkshopLabel = (meta: WorkOrderErpMeta) => meta.workshopName || meta.workshopCode || "-";

const getRoutingLabel = (meta: WorkOrderErpMeta) => meta.routingName || "-";

const getPickStatusBadge = (status?: string | null) => {
	if (!status || status === "1") return <Badge variant="outline">未领料</Badge>;
	if (status === "2")
		return (
			<Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
				部分领料
			</Badge>
		);
	if (status === "3")
		return (
			<Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
				全部领料
			</Badge>
		);
	if (status === "4")
		return (
			<Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
				超额领料
			</Badge>
		);
	return <Badge variant="outline">{status}</Badge>;
};

export const getPickStatusLabel = (status?: string | null) => {
	switch (status) {
		case "1":
			return "未领料";
		case "2":
			return "部分领料";
		case "3":
			return "全部领料";
		case "4":
			return "超额领料";
		default:
			return "未同步";
	}
};

const getStatusBadge = (status: string) => {
	const label = WORK_ORDER_STATUS_MAP[status] || status;
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (status === "RELEASED") variant = "secondary";
	if (status === "IN_PROGRESS") variant = "default";
	if (status === "COMPLETED") variant = "outline";

	return <Badge variant={variant}>{label}</Badge>;
};

const renderRoutingValue = (workOrder: WorkOrder) => {
	const routing = workOrder.routing;
	if (!routing) {
		return (
			<span className="inline-flex items-center gap-1 text-amber-600">
				<AlertTriangle className="h-3.5 w-3.5" />
				<span className="text-xs">未关联路由</span>
			</span>
		);
	}
	return (
		<span className="text-sm">
			<span className="font-medium">{routing.code}</span>
			<span className="text-muted-foreground ml-1">{routing.name}</span>
		</span>
	);
};

export const workOrderFieldMeta: DataListFieldMeta<WorkOrder>[] = [
	{
		key: "woNo",
		label: "工单号",
		sortable: true,
		cardPrimary: true,
		cardValue: (workOrder) => workOrder.woNo,
		tableCell: (workOrder) => <span className="font-medium">{workOrder.woNo}</span>,
	},
	{
		key: "productCode",
		label: "产品编码",
		sortable: true,
		cardSecondary: true,
		cardValue: (workOrder) => workOrder.productCode,
		tableCell: (workOrder) => {
			const detail = getProductDetail(getErpMeta(workOrder));
			return (
				<div className="flex max-w-[220px] flex-col">
					<span className="truncate">{workOrder.productCode}</span>
					{detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
				</div>
			);
		},
	},
	{
		key: "workshop",
		label: "车间",
		sortable: false,
		accessorFn: (workOrder) => getWorkshopLabel(getErpMeta(workOrder)),
		tableCell: (workOrder) => getWorkshopLabel(getErpMeta(workOrder)),
	},
	{
		key: "routingName",
		label: "工艺路线",
		sortable: false,
		tableHidden: true,
		cardDetail: true,
		accessorFn: (workOrder) => getRoutingLabel(getErpMeta(workOrder)),
		tableCell: (workOrder) => getRoutingLabel(getErpMeta(workOrder)),
	},
	{
		key: "routing",
		label: "路由工艺",
		sortable: false,
		cardDetail: true,
		cardValue: (workOrder) => renderRoutingValue(workOrder),
		tableCell: (workOrder) => (
			<div className="max-w-[220px] truncate">{renderRoutingValue(workOrder)}</div>
		),
	},
	{
		key: "plannedQty",
		label: "计划数量",
		sortable: true,
		cardDetail: true,
		cardValue: (workOrder) => workOrder.plannedQty,
		tableCell: (workOrder) => workOrder.plannedQty,
	},
	{
		key: "pickStatus",
		label: "齐料进度",
		sortable: false,
		cardDetail: true,
		cardLabel: "物料状态",
		cardValue: (workOrder) => {
			const isErpWorkOrder = Boolean(workOrder.erpStatus);
			const status = isErpWorkOrder ? workOrder.erpPickStatus : workOrder.pickStatus;
			return getPickStatusLabel(status);
		},
		tableCell: (workOrder) => {
			const isErpWorkOrder = Boolean(workOrder.erpStatus);
			const status = isErpWorkOrder ? workOrder.erpPickStatus : workOrder.pickStatus;
			return getPickStatusBadge(status);
		},
	},
	{
		key: "status",
		label: "状态",
		sortable: true,
		cardBadge: true,
		cardValue: (workOrder) => getStatusBadge(workOrder.status),
		tableCell: (workOrder) => getStatusBadge(workOrder.status),
	},
	{
		key: "dueDate",
		label: "到期日期",
		sortable: true,
		cardDetail: true,
		cardValue: (workOrder) =>
			workOrder.dueDate ? format(new Date(workOrder.dueDate), "yyyy-MM-dd") : "-",
		tableCell: (workOrder) =>
			workOrder.dueDate ? format(new Date(workOrder.dueDate), "yyyy-MM-dd") : "-",
	},
	{
		key: "createdAt",
		label: "创建时间",
		sortable: true,
		cardDetail: true,
		cardValue: (workOrder) => format(new Date(workOrder.createdAt), "yyyy-MM-dd HH:mm"),
		tableCell: (workOrder) => format(new Date(workOrder.createdAt), "yyyy-MM-dd HH:mm"),
	},
];
