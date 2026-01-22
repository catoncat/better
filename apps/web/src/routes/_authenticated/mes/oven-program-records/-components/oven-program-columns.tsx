import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { OvenProgramRecord } from "@/hooks/use-oven-program-records";
import { ovenProgramFieldMeta } from "./oven-program-field-meta";

export const ovenProgramColumns: ColumnDef<OvenProgramRecord>[] = [
	...createColumnsFromFieldMeta(ovenProgramFieldMeta),
];
