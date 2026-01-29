import { Permission } from "@better-app/db/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { createColumnsFromFieldMeta } from "@/components/data-list/field-meta";
import { TableActions } from "@/components/data-table/table-actions";
import { useAbility } from "@/hooks/use-ability";
import type { FaiTemplateSummary } from "@/hooks/use-fai-templates";
import { faiTemplateFieldMeta } from "./field-meta";

export type FaiTemplateTableMeta = {
	onEdit?: (template: FaiTemplateSummary) => void;
	onToggleActive?: (template: FaiTemplateSummary) => void;
};

const actionsColumn: ColumnDef<FaiTemplateSummary> = {
	id: "actions",
	cell: ({ row, table }) => {
		const template = row.original;
		const meta = table.options.meta as FaiTemplateTableMeta | undefined;
		const { hasPermission } = useAbility();

		const actions = [];
		if (hasPermission(Permission.QUALITY_FAI)) {
			actions.push({
				icon: Edit,
				label: "编辑",
				onClick: () => meta?.onEdit?.(template),
			});
			actions.push({
				icon: template.isActive ? ToggleLeft : ToggleRight,
				label: template.isActive ? "停用" : "启用",
				onClick: () => meta?.onToggleActive?.(template),
			});
		}

		if (actions.length === 0) return null;
		return <TableActions actions={actions} />;
	},
	enableSorting: false,
	size: 60,
};

export const faiTemplateColumns: ColumnDef<FaiTemplateSummary>[] = [
	...createColumnsFromFieldMeta(faiTemplateFieldMeta),
	actionsColumn,
];
