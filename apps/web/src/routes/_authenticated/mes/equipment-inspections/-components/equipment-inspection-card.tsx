import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { EquipmentInspectionRecord } from "@/hooks/use-equipment-inspections";
import { equipmentInspectionFieldMeta } from "./equipment-inspection-field-meta";

interface EquipmentInspectionCardProps {
	record: EquipmentInspectionRecord;
}

export function EquipmentInspectionCard({ record }: EquipmentInspectionCardProps) {
	const primaryField = equipmentInspectionFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = equipmentInspectionFieldMeta.find((field) => field.cardSecondary);
	const badgeField = equipmentInspectionFieldMeta.find((field) => field.cardBadge);
	const detailFields = equipmentInspectionFieldMeta.filter((field) => field.cardDetail);

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
