import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { RouteSelect } from "@/components/select/route-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAbility } from "@/hooks/use-ability";
import {
	type RouteVersion,
	useCompileRouteVersion,
	useRouteVersions,
} from "@/hooks/use-route-versions";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mes/route-versions")({
	component: RouteVersionsPage,
});

function RouteVersionsPage() {
	const [routingCode, setRoutingCode] = useState("");
	const { hasPermission } = useAbility();
	const canViewRoutes = hasPermission(Permission.ROUTE_READ);
	const { data, isLoading, isFetching, refetch } = useRouteVersions(routingCode, {
		enabled: canViewRoutes,
	});
	const { mutateAsync: compileRoute, isPending: isCompiling } = useCompileRouteVersion();

	const versions = useMemo(() => data ?? [], [data]);

	const handleCompile = async () => {
		if (!routingCode) return;
		try {
			await compileRoute(routingCode);
		} catch {
			// handled by mutation onError toast
		}
	};

	const formatErrors = (errors: RouteVersion["errorsJson"]) => {
		if (!errors) return "-";
		if (Array.isArray(errors)) {
			return errors
				.map((item) => {
					if (!item || typeof item !== "object") return String(item);
					const record = item as { stepNo?: number; code?: string; message?: string };
					const stepLabel = record.stepNo ? `Step ${record.stepNo}` : "Step";
					return `${stepLabel} ${record.code ?? "ERROR"}: ${record.message ?? ""}`.trim();
				})
				.join("; ");
		}
		return JSON.stringify(errors);
	};

	const header = (
		<div className="flex flex-col gap-2">
			<h1 className="text-3xl font-bold tracking-tight">路由版本</h1>
			<p className="text-muted-foreground">查看路由编译结果，确保执行版本处于 READY。</p>
		</div>
	);

	if (!canViewRoutes) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要路由查看权限才能查看版本信息。" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{header}

			<Card>
				<CardHeader>
					<CardTitle>路由查询</CardTitle>
					<CardDescription>选择路由后查询版本，或直接编译生成最新版本。</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-3 md:flex-row md:items-end">
						<div className="w-full md:flex-1">
							<Label htmlFor="routing-code">路由编码</Label>
							<RouteSelect
								value={routingCode}
								onValueChange={(value) => setRoutingCode(value)}
								className="mt-2"
								placeholder="选择路由..."
								enabled={canViewRoutes}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline">
								<Link to="/mes/routes">路由管理</Link>
							</Button>
							<Button
								variant="secondary"
								onClick={() => refetch()}
								disabled={!routingCode || isFetching}
							>
								刷新
							</Button>
							<Can permissions={Permission.ROUTE_COMPILE}>
								<Button onClick={handleCompile} disabled={!routingCode || isCompiling}>
									编译路由
								</Button>
							</Can>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>版本列表</CardTitle>
					<CardDescription>按版本号倒序展示，INVALID 版本会显示编译错误。</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>版本号</TableHead>
								<TableHead>状态</TableHead>
								<TableHead>编译时间</TableHead>
								<TableHead>错误</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center text-muted-foreground">
										加载中...
									</TableCell>
								</TableRow>
							) : versions.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center text-muted-foreground">
										暂无版本记录
									</TableCell>
								</TableRow>
							) : (
								versions.map((version) => (
									<TableRow key={version.id}>
										<TableCell className="font-medium">v{version.versionNo}</TableCell>
										<TableCell>
											<Badge variant={version.status === "READY" ? "secondary" : "destructive"}>
												{version.status}
											</Badge>
										</TableCell>
										<TableCell>{formatDateTime(version.compiledAt)}</TableCell>
										<TableCell className="text-muted-foreground">
											{formatErrors(version.errorsJson)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
