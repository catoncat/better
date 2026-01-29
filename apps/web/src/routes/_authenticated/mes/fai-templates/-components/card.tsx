import { Permission } from "@better-app/db/permissions";
import { format } from "date-fns";
import { Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAbility } from "@/hooks/use-ability";
import type { FaiTemplateSummary } from "@/hooks/use-fai-templates";
import { getActiveBadge, getProcessBadge } from "./field-meta";

interface FaiTemplateCardProps {
	template: FaiTemplateSummary;
	onEdit?: (template: FaiTemplateSummary) => void;
	onToggleActive?: (template: FaiTemplateSummary) => void;
}

export function FaiTemplateCard({ template, onEdit, onToggleActive }: FaiTemplateCardProps) {
	const { hasPermission } = useAbility();
	const canManage = hasPermission(Permission.QUALITY_FAI);

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base font-medium truncate">{template.name}</CardTitle>
						<p className="text-sm text-muted-foreground truncate">
							{template.code} · {template.productCode}
						</p>
					</div>
					<div className="flex flex-shrink-0 items-center gap-1">
						{getProcessBadge(template.processType)}
						{getActiveBadge(template.isActive)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
					<div className="text-muted-foreground">版本</div>
					<div>{template.version ?? "-"}</div>

					<div className="text-muted-foreground">检验项</div>
					<div>{template.itemCount} 项</div>

					<div className="text-muted-foreground">更新时间</div>
					<div>{format(new Date(template.updatedAt), "yyyy-MM-dd HH:mm")}</div>
				</div>

				{canManage && (
					<div className="mt-3 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onEdit?.(template)}
						>
							<Edit className="mr-1 h-3 w-3" />
							编辑
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onToggleActive?.(template)}
						>
							{template.isActive ? (
								<>
									<ToggleLeft className="mr-1 h-3 w-3" />
									停用
								</>
							) : (
								<>
									<ToggleRight className="mr-1 h-3 w-3" />
									启用
								</>
							)}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
