import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ClipboardCheck, Eye, Play } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { type TableAction, TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { OqcInspection } from "@/hooks/use-oqc";
import { oqcFieldMeta } from "./oqc-field-meta";

export type OqcTableMeta = {
	onStart?: (oqcId: string) => void;
	onRecord?: (oqcId: string) => void;
	onComplete?: (oqcId: string) => void;
	onView?: (oqcId: string) => void;
};

const actionsColumn: ColumnDef<OqcInspection> = {
	id: "actions",
	cell: ({ row, table }) => {
		const oqc = row.original;
		const meta = table.options.meta as OqcTableMeta | undefined;
		const { hasPermission } = useAbility();
		const canOperate = hasPermission(Permission.QUALITY_OQC);

		const actions: TableAction[] = [];

		if (canOperate && oqc.status === "PENDING") {
			actions.push({
				icon: Play,
				label: "开始检验",
				onClick: () => meta?.onStart?.(oqc.id),
			});
		}

		if (canOperate && oqc.status === "INSPECTING") {
			actions.push({
				icon: ClipboardCheck,
				label: "录入检验项",
				onClick: () => meta?.onRecord?.(oqc.id),
			});
			actions.push({
				icon: CheckCircle2,
				label: "完成检验",
				onClick: () => meta?.onComplete?.(oqc.id),
			});
		}

		if (canOperate && (oqc.status === "PASS" || oqc.status === "FAIL")) {
			actions.push({
				icon: Eye,
				label: "查看记录",
				onClick: () => meta?.onView?.(oqc.id),
			});
		}

		return <TableActions actions={actions} />;
	},
};

export const oqcColumns: ColumnDef<OqcInspection>[] = [
	...createColumnsFromFieldMeta(oqcFieldMeta),
	actionsColumn,
];
