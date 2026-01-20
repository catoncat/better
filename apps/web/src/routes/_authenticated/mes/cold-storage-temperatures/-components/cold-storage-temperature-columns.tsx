import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { ColdStorageTemperatureRecord } from "@/hooks/use-cold-storage-temperatures";
import { coldStorageTemperatureFieldMeta } from "./cold-storage-temperature-field-meta";

export const coldStorageTemperatureColumns: ColumnDef<ColdStorageTemperatureRecord>[] = [
	...createColumnsFromFieldMeta(coldStorageTemperatureFieldMeta),
];
