import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ColdStorageTemperatureRecord } from "@/hooks/use-cold-storage-temperatures";
import { coldStorageTemperatureFieldMeta } from "./cold-storage-temperature-field-meta";

interface ColdStorageTemperatureCardProps {
	record: ColdStorageTemperatureRecord;
}

export function ColdStorageTemperatureCard({ record }: ColdStorageTemperatureCardProps) {
	const primaryField = coldStorageTemperatureFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = coldStorageTemperatureFieldMeta.find((field) => field.cardSecondary);
	const detailFields = coldStorageTemperatureFieldMeta.filter((field) => field.cardDetail);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium">{primaryField?.cardValue?.(record) ?? "-"}</div>
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
