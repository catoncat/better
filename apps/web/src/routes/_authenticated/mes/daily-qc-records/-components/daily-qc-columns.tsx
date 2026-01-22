import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { DailyQcRecord } from "@/hooks/use-daily-qc-records";
import { dailyQcFieldMeta } from "./daily-qc-field-meta";

export const dailyQcColumns: ColumnDef<DailyQcRecord>[] = [
	...createColumnsFromFieldMeta(dailyQcFieldMeta),
];
