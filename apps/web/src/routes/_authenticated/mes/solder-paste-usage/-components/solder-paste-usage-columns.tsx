import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { SolderPasteUsageRecord } from "@/hooks/use-solder-paste-usage";
import { solderPasteUsageFieldMeta } from "./solder-paste-usage-field-meta";

export const solderPasteUsageColumns: ColumnDef<SolderPasteUsageRecord>[] = [
	...createColumnsFromFieldMeta(solderPasteUsageFieldMeta),
];
