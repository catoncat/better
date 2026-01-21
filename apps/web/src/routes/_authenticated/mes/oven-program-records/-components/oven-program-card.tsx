import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { OvenProgramRecord } from "@/hooks/use-oven-program-records";
import { ovenProgramFieldMeta } from "./oven-program-field-meta";

interface OvenProgramCardProps {
	record: OvenProgramRecord;
}

export function OvenProgramCard({ record }: OvenProgramCardProps) {
	const primaryField = ovenProgramFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = ovenProgramFieldMeta.find((field) => field.cardSecondary);
	const badgeField = ovenProgramFieldMeta.find((field) => field.cardBadge);
	const detailFields = ovenProgramFieldMeta.filter((field) => field.cardDetail);

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
			</CardContent>
		</Card>
	);
}
