import { Permission } from "@better-app/db/permissions";
import { format } from "date-fns";
import { Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAbility } from "@/hooks/use-ability";
import type { DataCollectionSpec } from "@/hooks/use-data-collection-specs";
import {
	DATA_TYPE_MAP,
	getActiveBadge,
	getItemTypeBadge,
	METHOD_MAP,
	TRIGGER_TYPE_MAP,
} from "./field-meta";

interface DCSpecCardProps {
	spec: DataCollectionSpec;
	onEdit?: (spec: DataCollectionSpec) => void;
	onToggleActive?: (spec: DataCollectionSpec) => void;
}

export function DCSpecCard({ spec, onEdit, onToggleActive }: DCSpecCardProps) {
	const { hasPermission } = useAbility();
	const canConfig = hasPermission(Permission.DATA_SPEC_CONFIG);

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base font-medium truncate">{spec.name}</CardTitle>
						<p className="text-sm text-muted-foreground truncate">
							{spec.operationCode} - {spec.operationName}
						</p>
					</div>
					<div className="flex flex-shrink-0 items-center gap-1">
						{getItemTypeBadge(spec.itemType)}
						{getActiveBadge(spec.isActive)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
					<div className="text-muted-foreground">数据类型</div>
					<div>{DATA_TYPE_MAP[spec.dataType] ?? spec.dataType}</div>

					<div className="text-muted-foreground">采集方式</div>
					<div>{METHOD_MAP[spec.method] ?? spec.method}</div>

					<div className="text-muted-foreground">触发方式</div>
					<div>{TRIGGER_TYPE_MAP[spec.triggerType] ?? spec.triggerType}</div>

					<div className="text-muted-foreground">必填</div>
					<div>{spec.isRequired ? "是" : "否"}</div>

					<div className="text-muted-foreground">更新时间</div>
					<div>{format(new Date(spec.updatedAt), "yyyy-MM-dd HH:mm")}</div>
				</div>

				{canConfig && (
					<div className="mt-3 flex gap-2">
						<Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(spec)}>
							<Edit className="mr-1 h-3 w-3" />
							编辑
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onToggleActive?.(spec)}
						>
							{spec.isActive ? (
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
