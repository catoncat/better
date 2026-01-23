import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { MaintenanceRecord } from "@/hooks/use-maintenance";
import { maintenanceFieldMeta } from "./maintenance-field-meta";

export const maintenanceColumns: ColumnDef<MaintenanceRecord>[] = [
	...createColumnsFromFieldMeta(maintenanceFieldMeta),
];
