import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { EquipmentInspectionRecord } from "@/hooks/use-equipment-inspections";
import { equipmentInspectionFieldMeta } from "./equipment-inspection-field-meta";

export const equipmentInspectionColumns: ColumnDef<EquipmentInspectionRecord>[] = [
	...createColumnsFromFieldMeta(equipmentInspectionFieldMeta),
];
