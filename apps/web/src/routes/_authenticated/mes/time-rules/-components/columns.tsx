import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { TimeRuleDefinition } from "@/hooks/use-time-rules";
import { timeRuleFieldMeta } from "./field-meta";

export type TimeRuleTableMeta = {
	onEdit?: (rule: TimeRuleDefinition) => void;
	onToggleActive?: (rule: TimeRuleDefinition) => void;
};

const actionsColumn: ColumnDef<TimeRuleDefinition> = {
	id: "actions",
	cell: ({ row, table }) => {
		const rule = row.original;
		const meta = table.options.meta as TimeRuleTableMeta | undefined;
		const { hasPermission } = useAbility();

		const actions = [];

		if (hasPermission(Permission.READINESS_CONFIG)) {
			actions.push({
				icon: Edit,
				label: "编辑",
				onClick: () => meta?.onEdit?.(rule),
			});

			actions.push({
				icon: rule.isActive ? ToggleLeft : ToggleRight,
				label: rule.isActive ? "停用" : "启用",
				onClick: () => meta?.onToggleActive?.(rule),
			});
		}

		if (actions.length === 0) return null;

		return <TableActions actions={actions} />;
	},
	enableSorting: false,
	size: 60,
};

export const timeRuleColumns: ColumnDef<TimeRuleDefinition>[] = [
	...createColumnsFromFieldMeta(timeRuleFieldMeta),
	actionsColumn,
];
