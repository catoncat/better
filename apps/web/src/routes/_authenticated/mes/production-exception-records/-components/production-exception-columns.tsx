import type { ColumnDef } from "@tanstack/react-table";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import type { ProductionExceptionRecord } from "@/hooks/use-production-exception-records";
import { productionExceptionFieldMeta } from "./production-exception-field-meta";

export const productionExceptionColumns: ColumnDef<ProductionExceptionRecord>[] = [
	...createColumnsFromFieldMeta(productionExceptionFieldMeta),
];
