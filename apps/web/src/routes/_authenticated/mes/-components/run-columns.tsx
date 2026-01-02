import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { useAbility } from "@/hooks/use-ability";
import type { Run } from "@/hooks/use-runs";
import { runFieldMeta } from "./run-field-meta";

export type RunTableMeta = {
	onAuthorize?: (runNo: string) => void;
	onRevoke?: (runNo: string) => void;
	isRunSelected?: (runNo: string) => boolean;
	onSelectRun?: (runNo: string, selected: boolean) => void;
	onSelectAll?: (runNos: string[], selected: boolean) => void;
};

const selectionColumn: ColumnDef<Run> = {
	id: "select",
	header: ({ table }) => {
		const meta = table.options.meta as RunTableMeta | undefined;
		const runNos = table.getRowModel().rows.map((row) => row.original.runNo);
		const selectedCount = runNos.filter((runNo) => meta?.isRunSelected?.(runNo)).length;
		const allCount = runNos.length;
		const checked =
			allCount > 0 && selectedCount === allCount
				? true
				: selectedCount > 0
					? "indeterminate"
					: false;

		return (
			<Checkbox
				checked={checked}
				onCheckedChange={(value) => {
					meta?.onSelectAll?.(runNos, value === true);
				}}
				aria-label="选择全部"
			/>
		);
	},
	cell: ({ row, table }) => {
		const meta = table.options.meta as RunTableMeta | undefined;
		const runNo = row.original.runNo;
		return (
			<Checkbox
				checked={meta?.isRunSelected?.(runNo) ?? false}
				onCheckedChange={(value) => {
					meta?.onSelectRun?.(runNo, value === true);
				}}
				aria-label={`选择批次 ${runNo}`}
			/>
		);
	},
	enableSorting: false,
	size: 40,
};

const actionsColumn: ColumnDef<Run> = {
	id: "actions",
	cell: ({ row, table }) => {
		const run = row.original;
		const meta = table.options.meta as RunTableMeta | undefined;
		const { hasPermission } = useAbility();

		const actions = [];

		if (
			(run.status === "PREP" || run.status === "FAI_PENDING") &&
			hasPermission(Permission.RUN_AUTHORIZE)
		) {
			actions.push({
				icon: CheckCircle,
				label: "授权生产",
				onClick: () => meta?.onAuthorize?.(run.runNo),
			});
		}

		if (run.status === "AUTHORIZED" && hasPermission(Permission.RUN_REVOKE)) {
			actions.push({
				icon: XCircle,
				label: "撤销授权",
				onClick: () => meta?.onRevoke?.(run.runNo),
			});
		}

		return <TableActions actions={actions} />;
	},
};

export const runColumns: ColumnDef<Run>[] = [
	selectionColumn,
	...createColumnsFromFieldMeta(runFieldMeta),
	actionsColumn,
];
