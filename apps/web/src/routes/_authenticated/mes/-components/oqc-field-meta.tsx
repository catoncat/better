import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { OqcInspection } from "@/hooks/use-oqc";
import { INSPECTION_STATUS_MAP, RUN_STATUS_MAP } from "@/lib/constants";

const getOqcStatusBadge = (status: string) => {
	const label = INSPECTION_STATUS_MAP[status] ?? status;
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (status === "INSPECTING") variant = "default";
	if (status === "PASS") variant = "secondary";
	if (status === "FAIL") variant = "destructive";

	return <Badge variant={variant}>{label}</Badge>;
};

const getRunStatusBadge = (status: string) => {
	const label = RUN_STATUS_MAP[status] ?? status;
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (status === "AUTHORIZED" || status === "IN_PROGRESS") variant = "default";
	if (status === "COMPLETED" || status === "CLOSED_REWORK") variant = "secondary";
	if (status === "SCRAPPED") variant = "destructive";

	return <Badge variant={variant}>{label}</Badge>;
};

export const oqcFieldMeta: DataListFieldMeta<OqcInspection>[] = [
	{
		key: "runNo",
		label: "批次号",
		cardPrimary: true,
		accessorFn: (oqc) => oqc.run?.runNo,
		tableCell: (oqc) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: oqc.run?.runNo ?? "" }}
				className="font-medium text-primary hover:underline"
			>
				{oqc.run?.runNo ?? "-"}
			</Link>
		),
		cardValue: (oqc) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: oqc.run?.runNo ?? "" }}
				className="text-sm font-medium text-primary hover:underline"
			>
				{oqc.run?.runNo ?? "-"}
			</Link>
		),
	},
	{
		key: "status",
		label: "OQC 状态",
		cardBadge: true,
		tableCell: (oqc) => getOqcStatusBadge(oqc.status),
		cardValue: (oqc) => getOqcStatusBadge(oqc.status),
	},
	{
		key: "run.status",
		label: "批次状态",
		cardSecondary: true,
		accessorFn: (oqc) => oqc.run?.status,
		tableCell: (oqc) => (oqc.run?.status ? getRunStatusBadge(oqc.run.status) : <span>-</span>),
		cardValue: (oqc) => (oqc.run?.status ? getRunStatusBadge(oqc.run.status) : <span>-</span>),
	},
	{
		key: "sampleQty",
		label: "抽样数量",
		cardDetail: true,
		cardValue: (oqc) => oqc.sampleQty ?? "-",
		tableCell: (oqc) => oqc.sampleQty ?? "-",
	},
	{
		key: "passedQty",
		label: "通过数量",
		cardDetail: true,
		cardValue: (oqc) => oqc.passedQty ?? 0,
		tableCell: (oqc) => oqc.passedQty ?? 0,
	},
	{
		key: "failedQty",
		label: "失败数量",
		cardDetail: true,
		cardValue: (oqc) => oqc.failedQty ?? 0,
		tableCell: (oqc) => oqc.failedQty ?? 0,
	},
	{
		key: "itemCount",
		label: "检验项数",
		cardDetail: true,
		accessorFn: (oqc) => oqc.items?.length ?? 0,
		cardValue: (oqc) => oqc.items?.length ?? 0,
		tableCell: (oqc) => oqc.items?.length ?? 0,
	},
	{
		key: "createdAt",
		label: "创建时间",
		cardDetail: true,
		cardValue: (oqc) => format(new Date(oqc.createdAt), "yyyy-MM-dd HH:mm"),
		tableCell: (oqc) => format(new Date(oqc.createdAt), "yyyy-MM-dd HH:mm"),
	},
];
