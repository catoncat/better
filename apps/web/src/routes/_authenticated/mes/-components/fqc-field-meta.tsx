import { Link } from "@tanstack/react-router";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { FqcInspection } from "@/hooks/use-fqc";
import { INSPECTION_STATUS_MAP, RUN_STATUS_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const getFqcStatusBadge = (status: string) => {
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

export const fqcFieldMeta: DataListFieldMeta<FqcInspection>[] = [
	{
		key: "runNo",
		label: "批次号",
		cardPrimary: true,
		accessorFn: (fqc) => fqc.run?.runNo,
		tableCell: (fqc) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: fqc.run?.runNo ?? "" }}
				className="font-medium text-primary hover:underline"
			>
				{fqc.run?.runNo ?? "-"}
			</Link>
		),
		cardValue: (fqc) => (
			<Link
				to="/mes/runs/$runNo"
				params={{ runNo: fqc.run?.runNo ?? "" }}
				className="text-sm font-medium text-primary hover:underline"
			>
				{fqc.run?.runNo ?? "-"}
			</Link>
		),
	},
	{
		key: "status",
		label: "末件检验状态",
		cardBadge: true,
		tableCell: (fqc) => getFqcStatusBadge(fqc.status),
		cardValue: (fqc) => getFqcStatusBadge(fqc.status),
	},
	{
		key: "run.status",
		label: "批次状态",
		cardSecondary: true,
		accessorFn: (fqc) => fqc.run?.status,
		tableCell: (fqc) => (fqc.run?.status ? getRunStatusBadge(fqc.run.status) : <span>-</span>),
		cardValue: (fqc) => (fqc.run?.status ? getRunStatusBadge(fqc.run.status) : <span>-</span>),
	},
	{
		key: "sampleQty",
		label: "抽样数量",
		cardDetail: true,
		cardValue: (fqc) => fqc.sampleQty ?? "-",
		tableCell: (fqc) => fqc.sampleQty ?? "-",
	},
	{
		key: "passedQty",
		label: "通过数量",
		cardDetail: true,
		cardValue: (fqc) => fqc.passedQty ?? 0,
		tableCell: (fqc) => fqc.passedQty ?? 0,
	},
	{
		key: "failedQty",
		label: "失败数量",
		cardDetail: true,
		cardValue: (fqc) => fqc.failedQty ?? 0,
		tableCell: (fqc) => fqc.failedQty ?? 0,
	},
	{
		key: "itemCount",
		label: "检验项数",
		cardDetail: true,
		accessorFn: (fqc) => fqc.items?.length ?? 0,
		cardValue: (fqc) => fqc.items?.length ?? 0,
		tableCell: (fqc) => fqc.items?.length ?? 0,
	},
	{
		key: "signed",
		label: "签字",
		cardDetail: true,
		accessorFn: (fqc) => (fqc.signedBy && fqc.signedAt ? "SIGNED" : "UNSIGNED"),
		cardValue: (fqc) =>
			fqc.signedBy && fqc.signedAt ? (
				<Badge variant="secondary">已签字</Badge>
			) : (
				<Badge variant="outline">未签字</Badge>
			),
		tableCell: (fqc) =>
			fqc.signedBy && fqc.signedAt ? (
				<Badge variant="secondary">已签字</Badge>
			) : (
				<Badge variant="outline">未签字</Badge>
			),
	},
	{
		key: "createdAt",
		label: "创建时间",
		cardDetail: true,
		cardValue: (fqc) => formatDateTime(fqc.createdAt),
		tableCell: (fqc) => formatDateTime(fqc.createdAt),
	},
];
