import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouteSummary } from "@/hooks/use-routes";

interface RouteCardProps {
	route: RouteSummary;
}

export function RouteCard({ route }: RouteCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{route.code}</CardTitle>
				<Badge variant={route.sourceSystem === "ERP" ? "outline" : "secondary"}>
					{route.sourceSystem}
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{route.name}</div>
				<p className="text-xs text-muted-foreground">
					产品编码: {route.productCode || "-"}
				</p>
				<div className="mt-4 space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">步骤数:</span>
						<span>{route.stepCount}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">更新时间:</span>
						<span>{format(new Date(route.updatedAt), "yyyy-MM-dd HH:mm")}</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button variant="ghost" size="sm" asChild>
					<Link to="/mes/routes/$routingCode" params={{ routingCode: route.code }}>
						<Eye className="mr-2 h-4 w-4" />
						查看详情
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
