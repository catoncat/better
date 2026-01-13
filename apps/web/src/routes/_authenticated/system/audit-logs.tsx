import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/system/audit-logs")({
	component: SystemAuditLogsPage,
});

function SystemAuditLogsPage() {
	const serverUrl =
		import.meta.env.VITE_SERVER_URL ||
		(typeof window !== "undefined" ? window.location.origin : "");

	const openApiUrl = serverUrl ? `${serverUrl}/openapi` : "/openapi";
	const auditLogsUrl = serverUrl
		? `${serverUrl}/api/audit-logs?page=1&pageSize=30`
		: "/api/audit-logs?page=1&pageSize=30";

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">审计日志</h1>
				<p className="text-muted-foreground">
					查询关键操作的审计事件（用于排障、追责与合规留痕）。
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>查询入口</CardTitle>
					<CardDescription>通过 OpenAPI UI 或直接调用 API 查询审计事件。</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button asChild>
							<a href={openApiUrl} target="_blank" rel="noreferrer">
								打开 OpenAPI
								<ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button asChild variant="outline">
							<a href={auditLogsUrl} target="_blank" rel="noreferrer">
								打开审计日志 API
								<ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</Button>
					</div>

					<div className="text-sm text-muted-foreground">
						<div>
							API: `GET
							/api/audit-logs`（支持过滤：entityType/entityId/actorId/action/status/from/to）
						</div>
						<div>API: `GET /api/audit-logs/:id`</div>
						<div>运维与归档说明：`agent_docs/05_ops/single_binary_deployment.md`</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
