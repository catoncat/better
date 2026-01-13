import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { Run } from "@/hooks/use-runs";
import { READINESS_STATUS_MAP, RUN_STATUS_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type RunWithReadiness = Run & { readinessStatus?: string | null };

const getRunStatusBadge = (status: string) => {
	const label = RUN_STATUS_MAP[status] || status;
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (status === "AUTHORIZED") variant = "secondary";
	if (status === "IN_PROGRESS") variant = "default";
	if (status === "CLOSED_REWORK") variant = "secondary";
	if (status === "SCRAPPED") variant = "destructive";

	return <Badge variant={variant}>{label}</Badge>;
};

const getReadinessBadge = (readinessStatus?: string | null) => {
	if (!readinessStatus) return <span className="text-muted-foreground">-</span>;

	const label = READINESS_STATUS_MAP[readinessStatus] || readinessStatus;
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (readinessStatus === "PENDING") variant = "outline";
	if (readinessStatus === "PASSED") variant = "secondary";
	if (readinessStatus === "FAILED") variant = "destructive";

	return <Badge variant={variant}>{label}</Badge>;
};

export const runFieldMeta: DataListFieldMeta<Run>[] = [
	{
		key: "runNo",
		label: "批次号",
		sortable: true,
		cardPrimary: true,
		tableCell: (run) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: run.runNo }}
				className="font-medium text-primary hover:underline"
			>
				{run.runNo}
			</Link>
		),
		cardValue: (run) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: run.runNo }}
				className="text-sm font-medium text-primary hover:underline"
			>
				{run.runNo}
			</Link>
		),
	},
	{
		key: "workOrder.woNo",
		label: "工单号",
		sortable: true,
		accessorFn: (run) => run.workOrder?.woNo,
		cardSecondary: true,
		cardValue: (run) => run.workOrder?.woNo || "-",
		tableCell: (run) => run.workOrder?.woNo || "-",
	},
	{
		key: "lineCode",
		label: "线体",
		sortable: true,
		accessorFn: (run) => run.line?.code,
		cardDetail: true,
		cardValue: (run) => run.line?.code || "-",
		tableCell: (run) => run.line?.code || "-",
	},
	{
		key: "status",
		label: "状态",
		sortable: true,
		cardBadge: true,
		tableCell: (run) => getRunStatusBadge(run.status),
		cardValue: (run) => getRunStatusBadge(run.status),
	},
	{
		key: "readinessStatus",
		label: "准备检查",
		accessorFn: (run) => (run as RunWithReadiness).readinessStatus,
		cardDetail: true,
		tableCell: (run) => getReadinessBadge((run as RunWithReadiness).readinessStatus),
		cardValue: (run) => getReadinessBadge((run as RunWithReadiness).readinessStatus),
	},
	{
		key: "shiftCode",
		label: "班次",
		sortable: true,
		cardDetail: true,
		cardValue: (run) => run.shiftCode || "-",
		tableCell: (run) => run.shiftCode || "-",
	},
	{
		key: "createdAt",
		label: "创建时间",
		sortable: true,
		cardDetail: true,
		cardValue: (run) => formatDateTime(run.createdAt),
		tableCell: (run) => formatDateTime(run.createdAt),
	},
];
