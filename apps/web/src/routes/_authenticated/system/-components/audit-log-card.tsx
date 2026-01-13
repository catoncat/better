import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditLogItem } from "@/hooks/use-audit-logs";
import { AUDIT_ENTITY_TYPE_MAP, AUDIT_STATUS_MAP } from "@/lib/constants";

const formatTime = (value?: string | null) => {
	if (!value) return "-";
	return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
};

const StatusBadge = ({ status }: { status: string }) => (
	<Badge variant={status === "SUCCESS" ? "default" : "destructive"} title={status}>
		{AUDIT_STATUS_MAP[status] ?? status}
	</Badge>
);

const EntityTypeBadge = ({ entityType }: { entityType: string }) => (
	<Badge variant="outline">{AUDIT_ENTITY_TYPE_MAP[entityType] ?? String(entityType)}</Badge>
);

export function AuditLogCard({ item }: { item: AuditLogItem }) {
	const actorLabel = item.actorName || item.actorId || "-";
	const entityTypeLabel = AUDIT_ENTITY_TYPE_MAP[item.entityType] ?? String(item.entityType);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium flex items-start justify-between gap-2">
					<div className="min-w-0">
						<div className="font-mono truncate">{item.action}</div>
						<div className="text-xs text-muted-foreground mt-1 truncate">
							{entityTypeLabel} · <span className="font-mono">{item.entityId}</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<StatusBadge status={item.status} />
						<EntityTypeBadge entityType={item.entityType} />
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="text-sm text-muted-foreground space-y-1">
				<div className="flex justify-between gap-3">
					<span>操作者</span>
					<span className="text-foreground truncate">{actorLabel}</span>
				</div>
				<div className="flex justify-between gap-3">
					<span>时间</span>
					<span className="text-foreground font-mono text-xs">{formatTime(item.createdAt)}</span>
				</div>
				{item.errorMessage ? (
					<div className="pt-2 text-destructive text-xs break-words">{item.errorMessage}</div>
				) : null}
			</CardContent>
		</Card>
	);
}
