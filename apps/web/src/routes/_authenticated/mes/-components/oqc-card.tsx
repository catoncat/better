import { Permission } from "@better-app/db/permissions";
import { ClipboardCheck, Eye, Play, CheckCircle2 } from "lucide-react";
import { Can } from "@/components/ability/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { OqcInspection } from "@/hooks/use-oqc";
import { oqcFieldMeta } from "./oqc-field-meta";

interface OqcCardProps {
	oqc: OqcInspection;
	onStart?: (oqcId: string) => void;
	onRecord?: (oqcId: string) => void;
	onComplete?: (oqcId: string) => void;
	onView?: (oqcId: string) => void;
}

export function OqcCard({ oqc, onStart, onRecord, onComplete, onView }: OqcCardProps) {
	const primaryField = oqcFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = oqcFieldMeta.find((field) => field.cardSecondary);
	const badgeField = oqcFieldMeta.find((field) => field.cardBadge);
	const detailFields = oqcFieldMeta.filter((field) => field.cardDetail);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium">
					{primaryField?.cardValue?.(oqc) ?? "-"}
				</div>
				{badgeField?.cardValue?.(oqc)}
			</CardHeader>
			<CardContent>
				<div className="text-lg font-bold">
					{secondaryField?.cardValue?.(oqc) ?? "-"}
				</div>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => (
						<div key={field.key} className="flex justify-between">
							<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
							<span>{field.cardValue?.(oqc) ?? "-"}</span>
						</div>
					))}
				</div>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
				<Can permissions={Permission.QUALITY_OQC}>
					{oqc.status === "PENDING" && (
						<Button variant="ghost" size="sm" onClick={() => onStart?.(oqc.id)}>
							<Play className="mr-2 h-4 w-4" />
							开始检验
						</Button>
					)}
					{oqc.status === "INSPECTING" && (
						<>
							<Button variant="ghost" size="sm" onClick={() => onRecord?.(oqc.id)}>
								<ClipboardCheck className="mr-2 h-4 w-4" />
								录入检验项
							</Button>
							<Button variant="ghost" size="sm" onClick={() => onComplete?.(oqc.id)}>
								<CheckCircle2 className="mr-2 h-4 w-4" />
								完成检验
							</Button>
						</>
					)}
				</Can>
				{(oqc.status === "PASS" || oqc.status === "FAIL") && (
					<Button variant="ghost" size="sm" onClick={() => onView?.(oqc.id)}>
						<Eye className="mr-2 h-4 w-4" />
						查看记录
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
