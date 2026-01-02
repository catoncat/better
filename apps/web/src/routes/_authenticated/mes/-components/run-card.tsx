import { Permission } from "@better-app/db/permissions";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { Can } from "@/components/ability/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Run } from "@/hooks/use-runs";
import { RUN_STATUS_MAP } from "@/lib/constants";

interface RunCardProps {
	run: Run;
	onAuthorize?: (runNo: string) => void;
	onRevoke?: (runNo: string) => void;
}

export function RunCard({ run, onAuthorize, onRevoke }: RunCardProps) {
	const statusLabel = RUN_STATUS_MAP[run.status] || run.status;
	let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

	if (run.status === "AUTHORIZED") statusVariant = "secondary";
	if (run.status === "RUNNING") statusVariant = "default";
	if (run.status === "CANCELLED") statusVariant = "destructive";

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Link
					to="/mes/runs/$runNo"
					params={{ runNo: run.runNo }}
					className="text-sm font-medium text-primary hover:underline"
				>
					{run.runNo}
				</Link>
				<Badge variant={statusVariant}>{statusLabel}</Badge>
			</CardHeader>
			<CardContent>
				<div className="text-lg font-bold">{run.workOrder?.woNo || "-"}</div>
				<p className="text-xs text-muted-foreground">
					线体: {run.line?.code || "-"} · 班次: {run.shiftCode || "-"}
				</p>
				<div className="mt-4 space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">创建时间:</span>
						<span>{format(new Date(run.createdAt), "yyyy-MM-dd HH:mm")}</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end space-x-2">
				{(run.status === "PREP" || run.status === "FAI_PENDING") && (
					<Can permissions={Permission.RUN_AUTHORIZE}>
						<Button variant="ghost" size="sm" onClick={() => onAuthorize?.(run.runNo)}>
							<CheckCircle className="mr-2 h-4 w-4" />
							授权生产
						</Button>
					</Can>
				)}
				{run.status === "AUTHORIZED" && (
					<Can permissions={Permission.RUN_REVOKE}>
						<Button variant="ghost" size="sm" onClick={() => onRevoke?.(run.runNo)}>
							<XCircle className="mr-2 h-4 w-4" />
							撤销授权
						</Button>
					</Can>
				)}
			</CardFooter>
		</Card>
	);
}
