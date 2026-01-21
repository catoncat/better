import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { StencilCleaningRecord } from "@/hooks/use-stencil-cleaning";
import { stencilCleaningFieldMeta } from "./stencil-cleaning-field-meta";

export const stencilCleaningColumns: ColumnDef<StencilCleaningRecord>[] = [
	...createColumnsFromFieldMeta(stencilCleaningFieldMeta),
];
