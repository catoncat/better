import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouteSummary } from "@/hooks/use-routes";
import { routeFieldMeta } from "./route-field-meta";

interface RouteCardProps {
	route: RouteSummary;
}

export function RouteCard({ route }: RouteCardProps) {
	const primaryField = routeFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = routeFieldMeta.find((field) => field.cardSecondary);
	const badgeField = routeFieldMeta.find((field) => field.cardBadge);
	const detailFields = routeFieldMeta.filter((field) => field.cardDetail);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					{primaryField?.cardValue?.(route) ?? route.code}
				</CardTitle>
				{badgeField?.cardValue?.(route)}
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{secondaryField?.cardValue?.(route)}</div>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => (
						<div key={field.key} className="flex justify-between">
							<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
							<span>{field.cardValue?.(route) ?? "-"}</span>
						</div>
					))}
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
