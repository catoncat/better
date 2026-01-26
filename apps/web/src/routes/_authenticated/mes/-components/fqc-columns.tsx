import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ClipboardCheck, Eye, Pen, Play } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { type TableAction, TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { FqcInspection } from "@/hooks/use-fqc";
import { fqcFieldMeta } from "./fqc-field-meta";

export type FqcTableMeta = {
	onStart?: (fqcId: string) => void;
	onRecord?: (fqcId: string) => void;
	onComplete?: (fqcId: string) => void;
	onSign?: (fqcId: string) => void;
	onView?: (fqcId: string) => void;
};

const actionsColumn: ColumnDef<FqcInspection> = {
	id: "actions",
	cell: ({ row, table }) => {
		const fqc = row.original;
		const meta = table.options.meta as FqcTableMeta | undefined;
		const { hasPermission } = useAbility();
		const canOperate = hasPermission(Permission.QUALITY_FAI);

		const actions: TableAction[] = [];

		if (canOperate && fqc.status === "PENDING") {
			actions.push({
				icon: Play,
				label: "开始检验",
				onClick: () => meta?.onStart?.(fqc.id),
			});
		}

		if (canOperate && fqc.status === "INSPECTING") {
			actions.push({
				icon: ClipboardCheck,
				label: "录入检验项",
				onClick: () => meta?.onRecord?.(fqc.id),
			});
			actions.push({
				icon: CheckCircle2,
				label: "完成检验",
				onClick: () => meta?.onComplete?.(fqc.id),
			});
		}

		if (canOperate && fqc.status === "PASS" && !(fqc.signedBy && fqc.signedAt)) {
			actions.push({
				icon: Pen,
				label: "签字确认",
				onClick: () => meta?.onSign?.(fqc.id),
			});
		}

		if (canOperate && (fqc.status === "PASS" || fqc.status === "FAIL")) {
			actions.push({
				icon: Eye,
				label: "查看记录",
				onClick: () => meta?.onView?.(fqc.id),
			});
		}

		return <TableActions actions={actions} />;
	},
};

export const fqcColumns: ColumnDef<FqcInspection>[] = [
	...createColumnsFromFieldMeta(fqcFieldMeta),
	actionsColumn,
];
