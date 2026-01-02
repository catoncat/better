import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Badge } from "@/components/ui/badge";
import type { RouteSummary } from "@/hooks/use-routes";

const getSourceBadge = (sourceSystem: string) => {
	const label = sourceSystem === "ERP" ? "ERP" : "MES";
	return <Badge variant={sourceSystem === "ERP" ? "outline" : "secondary"}>{label}</Badge>;
};

export const routeFieldMeta: DataListFieldMeta<RouteSummary>[] = [
	{
		key: "code",
		label: "路由编码",
		sortable: true,
		cardPrimary: true,
		tableCell: (route) => (
			<Link
				to="/mes/routes/$routingCode"
				params={{ routingCode: route.code }}
				className="font-medium text-foreground hover:underline"
			>
				{route.code}
			</Link>
		),
		cardValue: (route) => (
			<Link
				to="/mes/routes/$routingCode"
				params={{ routingCode: route.code }}
				className="text-sm font-medium text-foreground hover:underline"
			>
				{route.code}
			</Link>
		),
	},
	{
		key: "name",
		label: "名称",
		sortable: true,
		cardSecondary: true,
		cardValue: (route) => route.name,
		tableCell: (route) => route.name,
	},
	{
		key: "productCode",
		label: "产品编码",
		sortable: true,
		cardDetail: true,
		cardValue: (route) => route.productCode || "-",
		tableCell: (route) => route.productCode || "-",
	},
	{
		key: "sourceSystem",
		label: "来源",
		sortable: true,
		cardBadge: true,
		cardValue: (route) => getSourceBadge(route.sourceSystem),
		tableCell: (route) => getSourceBadge(route.sourceSystem),
	},
	{
		key: "stepCount",
		label: "步骤数",
		sortable: true,
		cardDetail: true,
		cardValue: (route) => route.stepCount,
		tableCell: (route) => route.stepCount,
	},
	{
		key: "updatedAt",
		label: "更新时间",
		sortable: true,
		cardDetail: true,
		cardValue: (route) => format(new Date(route.updatedAt), "yyyy-MM-dd HH:mm"),
		tableCell: (route) => format(new Date(route.updatedAt), "yyyy-MM-dd HH:mm"),
	},
];
