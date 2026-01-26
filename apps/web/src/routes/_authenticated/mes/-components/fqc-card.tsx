import { Permission } from "@better-app/db/permissions";
import { CheckCircle2, ClipboardCheck, Eye, Pen, Play } from "lucide-react";
import { Can } from "@/components/ability/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { FqcInspection } from "@/hooks/use-fqc";
import { fqcFieldMeta } from "./fqc-field-meta";

interface FqcCardProps {
	fqc: FqcInspection;
	onStart?: (fqcId: string) => void;
	onRecord?: (fqcId: string) => void;
	onComplete?: (fqcId: string) => void;
	onSign?: (fqcId: string) => void;
	onView?: (fqcId: string) => void;
}

export function FqcCard({ fqc, onStart, onRecord, onComplete, onSign, onView }: FqcCardProps) {
	const primaryField = fqcFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = fqcFieldMeta.find((field) => field.cardSecondary);
	const badgeField = fqcFieldMeta.find((field) => field.cardBadge);
	const detailFields = fqcFieldMeta.filter((field) => field.cardDetail);

	const needsSign = fqc.status === "PASS" && !(fqc.signedBy && fqc.signedAt);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium">{primaryField?.cardValue?.(fqc) ?? "-"}</div>
				{badgeField?.cardValue?.(fqc)}
			</CardHeader>
			<CardContent>
				<div className="text-lg font-bold">{secondaryField?.cardValue?.(fqc) ?? "-"}</div>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => (
						<div key={field.key} className="flex justify-between">
							<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
							<span>{field.cardValue?.(fqc) ?? "-"}</span>
						</div>
					))}
				</div>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
				<Can permissions={Permission.QUALITY_FAI}>
					{fqc.status === "PENDING" && (
						<Button variant="ghost" size="sm" onClick={() => onStart?.(fqc.id)}>
							<Play className="mr-2 h-4 w-4" />
							开始检验
						</Button>
					)}
					{fqc.status === "INSPECTING" && (
						<>
							<Button variant="ghost" size="sm" onClick={() => onRecord?.(fqc.id)}>
								<ClipboardCheck className="mr-2 h-4 w-4" />
								录入检验项
							</Button>
							<Button variant="ghost" size="sm" onClick={() => onComplete?.(fqc.id)}>
								<CheckCircle2 className="mr-2 h-4 w-4" />
								完成检验
							</Button>
						</>
					)}
					{needsSign && (
						<Button variant="ghost" size="sm" onClick={() => onSign?.(fqc.id)}>
							<Pen className="mr-2 h-4 w-4" />
							签字确认
						</Button>
					)}
					{(fqc.status === "PASS" || fqc.status === "FAIL") && (
						<Button variant="ghost" size="sm" onClick={() => onView?.(fqc.id)}>
							<Eye className="mr-2 h-4 w-4" />
							查看记录
						</Button>
					)}
				</Can>
			</CardFooter>
		</Card>
	);
}
