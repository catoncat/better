import { Permission } from "@better-app/db/permissions";
import { Can } from "@/components/ability/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ProductionExceptionRecord } from "@/hooks/use-production-exception-records";
import { productionExceptionFieldMeta } from "./production-exception-field-meta";

interface ProductionExceptionCardProps {
	record: ProductionExceptionRecord;
	onConfirm?: (record: ProductionExceptionRecord) => void;
}

export function ProductionExceptionCard({ record, onConfirm }: ProductionExceptionCardProps) {
	const primaryField = productionExceptionFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = productionExceptionFieldMeta.find((field) => field.cardSecondary);
	const badgeField = productionExceptionFieldMeta.find((field) => field.cardBadge);
	const detailFields = productionExceptionFieldMeta.filter((field) => field.cardDetail);
	const canConfirm = !record.confirmedAt && onConfirm;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium">{primaryField?.cardValue?.(record) ?? "-"}</div>
				{badgeField?.cardValue?.(record)}
			</CardHeader>
			<CardContent>
				<div className="text-lg font-bold">{secondaryField?.cardValue?.(record) ?? "-"}</div>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => (
						<div key={field.key} className="flex justify-between">
							<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
							<span>{field.cardValue?.(record) ?? "-"}</span>
						</div>
					))}
				</div>
				{canConfirm ? (
					<div className="mt-4">
						<Can permissions={Permission.QUALITY_OQC}>
							<Button size="sm" variant="secondary" onClick={() => onConfirm?.(record)}>
								确认闭环
							</Button>
						</Can>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
