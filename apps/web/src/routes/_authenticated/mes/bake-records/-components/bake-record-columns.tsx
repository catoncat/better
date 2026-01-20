import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { BakeRecord } from "@/hooks/use-bake-records";
import { bakeRecordFieldMeta } from "./bake-record-field-meta";

export const bakeRecordColumns: ColumnDef<BakeRecord>[] = [
	...createColumnsFromFieldMeta(bakeRecordFieldMeta),
];
