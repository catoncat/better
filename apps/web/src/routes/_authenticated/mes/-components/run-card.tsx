import { Permission } from "@better-app/db/permissions";
import { Link } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";
import { Can } from "@/components/ability/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Run } from "@/hooks/use-runs";
import { runFieldMeta } from "./run-field-meta";

interface RunCardProps {
	run: Run;
	onAuthorize?: (runNo: string) => void;
	onRevoke?: (runNo: string) => void;
}

export function RunCard({ run, onAuthorize, onRevoke }: RunCardProps) {
	const primaryField = runFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = runFieldMeta.find((field) => field.cardSecondary);
	const badgeField = runFieldMeta.find((field) => field.cardBadge);
	const detailFields = runFieldMeta.filter((field) => field.cardDetail);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium">
					{primaryField?.cardValue?.(run) ?? (
						<Link
							to="/mes/runs/$runNo"
							params={{ runNo: run.runNo }}
							className="text-sm font-medium text-primary hover:underline"
						>
							{run.runNo}
						</Link>
					)}
				</div>
				{badgeField?.cardValue?.(run)}
			</CardHeader>
			<CardContent>
				<div className="text-lg font-bold">{secondaryField?.cardValue?.(run) ?? "-"}</div>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => (
						<div key={field.key} className="flex justify-between">
							<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
							<span>{field.cardValue?.(run) ?? "-"}</span>
						</div>
					))}
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
