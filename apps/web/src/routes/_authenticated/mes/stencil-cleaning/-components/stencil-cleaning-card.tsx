import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { StencilCleaningRecord } from "@/hooks/use-stencil-cleaning";
import { stencilCleaningFieldMeta } from "./stencil-cleaning-field-meta";

interface StencilCleaningCardProps {
	record: StencilCleaningRecord;
}

export function StencilCleaningCard({ record }: StencilCleaningCardProps) {
	const primaryField = stencilCleaningFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = stencilCleaningFieldMeta.find((field) => field.cardSecondary);
	const badgeField = stencilCleaningFieldMeta.find((field) => field.cardBadge);
	const detailFields = stencilCleaningFieldMeta.filter((field) => field.cardDetail);

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
