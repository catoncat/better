import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { SqueegeeUsageRecord } from "@/hooks/use-squeegee-usage";
import { squeegeeUsageFieldMeta } from "./squeegee-usage-field-meta";

export const squeegeeUsageColumns: ColumnDef<SqueegeeUsageRecord>[] = [
	...createColumnsFromFieldMeta(squeegeeUsageFieldMeta),
];
