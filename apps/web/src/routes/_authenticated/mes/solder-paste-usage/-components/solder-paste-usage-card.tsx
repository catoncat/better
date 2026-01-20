import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SolderPasteUsageRecord } from "@/hooks/use-solder-paste-usage";
import { solderPasteUsageFieldMeta } from "./solder-paste-usage-field-meta";

interface SolderPasteUsageCardProps {
	record: SolderPasteUsageRecord;
}

export function SolderPasteUsageCard({ record }: SolderPasteUsageCardProps) {
	const primaryField = solderPasteUsageFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = solderPasteUsageFieldMeta.find((field) => field.cardSecondary);
	const badgeField = solderPasteUsageFieldMeta.find((field) => field.cardBadge);
	const detailFields = solderPasteUsageFieldMeta.filter((field) => field.cardDetail);

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
							<span className="text-muted-foreground">
								{field.cardLabel ?? field.label}:
							</span>
							<span>{field.cardValue?.(record) ?? "-"}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
