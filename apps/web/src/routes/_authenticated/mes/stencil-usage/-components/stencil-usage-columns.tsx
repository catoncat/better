import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { StencilUsageRecord } from "@/hooks/use-stencil-usage";
import { stencilUsageFieldMeta } from "./stencil-usage-field-meta";

export const stencilUsageColumns: ColumnDef<StencilUsageRecord>[] = [
	...createColumnsFromFieldMeta(stencilUsageFieldMeta),
];
