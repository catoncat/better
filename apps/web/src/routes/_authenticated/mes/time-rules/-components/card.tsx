import { Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { TimeRuleDefinition } from "@/hooks/use-time-rules";

interface TimeRuleCardProps {
	rule: TimeRuleDefinition;
	onEdit: (rule: TimeRuleDefinition) => void;
	onToggleActive: (rule: TimeRuleDefinition) => void;
}

export function TimeRuleCard({ rule, onEdit, onToggleActive }: TimeRuleCardProps) {
	return (
		<Card className="flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-bold">
					<div className="flex flex-col gap-1">
						<span>{rule.name}</span>
						<span className="font-mono text-xs text-muted-foreground">{rule.code}</span>
					</div>
				</CardTitle>
				<Badge variant={rule.ruleType === "SOLDER_PASTE_EXPOSURE" ? "default" : "secondary"}>
					{rule.ruleType === "SOLDER_PASTE_EXPOSURE" ? "锡膏暴露" : "水洗时限"}
				</Badge>
			</CardHeader>
			<CardContent className="flex-1 space-y-4 pt-4">
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground">时限</span>
						<span className="font-medium">
							{rule.durationMinutes} min ({(rule.durationMinutes / 60).toFixed(1)} h)
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground">预警</span>
						<span className="font-medium">
							{rule.warningMinutes ? `${rule.warningMinutes} min` : "-"}
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground">范围</span>
						<Badge variant="outline" className="w-fit">
							{rule.scope}
						</Badge>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground">启动事件</span>
						<span className="truncate text-xs font-mono" title={rule.startEvent}>
							{rule.startEvent}
						</span>
					</div>
				</div>
				{rule.description && (
					<p className="line-clamp-2 text-xs text-muted-foreground">{rule.description}</p>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between border-t pt-4">
				<div className="flex items-center gap-2">
					<Switch
						checked={rule.isActive}
						onCheckedChange={() => onToggleActive(rule)}
						id={`active-${rule.id}`}
					/>
					<label htmlFor={`active-${rule.id}`} className="text-xs text-muted-foreground">
						{rule.isActive ? "已启用" : "已停用"}
					</label>
				</div>
				<Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
					<Edit2 className="mr-2 h-4 w-4" />
					编辑
				</Button>
			</CardFooter>
		</Card>
	);
}
