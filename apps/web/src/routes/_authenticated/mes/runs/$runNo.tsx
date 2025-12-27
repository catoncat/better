import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Package, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useRunDetail } from "@/hooks/use-runs";

export const Route = createFileRoute("/_authenticated/mes/runs/$runNo")({
	component: RunDetailPage,
});

function RunDetailPage() {
	const { runNo } = Route.useParams();
	const { data, isLoading, refetch, isFetching } = useRunDetail(runNo);

	const formatTime = (value?: string | null) => {
		if (!value) return "-";
		return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
	};

	const getStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			PREP: { label: "准备中", variant: "outline" },
			FAI_PENDING: { label: "待FAI", variant: "outline" },
			AUTHORIZED: { label: "已授权", variant: "default" },
			RUNNING: { label: "生产中", variant: "default" },
			FINISHING: { label: "收尾中", variant: "secondary" },
			ARCHIVED: { label: "已归档", variant: "secondary" },
			CANCELLED: { label: "已取消", variant: "destructive" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getUnitStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			QUEUED: { label: "排队", variant: "outline" },
			IN_STATION: { label: "在站", variant: "default" },
			DONE: { label: "完成", variant: "secondary" },
			NG: { label: "不良", variant: "destructive" },
			SCRAPPED: { label: "报废", variant: "destructive" },
			HOLD: { label: "冻结", variant: "outline" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">加载中...</p>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/mes/runs">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<h1 className="text-2xl font-bold">批次未找到</h1>
				</div>
				<p className="text-muted-foreground">批次号 {runNo} 不存在。</p>
			</div>
		);
	}

	const progressPercent =
		data.unitStats.total > 0 ? Math.round((data.unitStats.done / data.unitStats.total) * 100) : 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/mes/runs">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold tracking-tight">{data.run.runNo}</h1>
							{getStatusBadge(data.run.status)}
						</div>
						<p className="text-muted-foreground">
							工单: {data.workOrder.woNo} · 产品: {data.workOrder.productCode}
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
					<RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
					刷新
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>计划数量</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{data.workOrder.plannedQty}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>实际生产</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{data.unitStats.total}</p>
						<p className="text-xs text-muted-foreground">完成率: {progressPercent}%</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>进行中</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-blue-600">
							{data.unitStats.queued + data.unitStats.inStation}
						</p>
						<p className="text-xs text-muted-foreground">
							排队: {data.unitStats.queued} · 在站: {data.unitStats.inStation}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>异常</CardDescription>
					</CardHeader>
					<CardContent>
						<p className={`text-2xl font-bold ${data.unitStats.failed > 0 ? "text-red-600" : ""}`}>
							{data.unitStats.failed}
						</p>
						<p className="text-xs text-muted-foreground">不良/报废/冻结</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>批次信息</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						<div>
							<p className="text-sm text-muted-foreground">产线</p>
							<p className="font-medium">
								{data.line ? `${data.line.name} (${data.line.code})` : "-"}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">班次</p>
							<p className="font-medium">{data.run.shiftCode ?? "-"}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">开始时间</p>
							<p className="font-medium">{formatTime(data.run.startedAt)}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">结束时间</p>
							<p className="font-medium">{formatTime(data.run.endedAt)}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">创建时间</p>
							<p className="font-medium">{formatTime(data.run.createdAt)}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>路由版本</CardTitle>
					</CardHeader>
					<CardContent>
						{data.routeVersion ? (
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<p className="text-sm text-muted-foreground">路由编码</p>
									<Link
										to="/mes/routes/$routingCode"
										params={{ routingCode: data.routeVersion.route.code }}
										className="font-medium text-primary hover:underline"
									>
										{data.routeVersion.route.code}
									</Link>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">路由名称</p>
									<p className="font-medium">{data.routeVersion.route.name}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">版本号</p>
									<p className="font-medium">v{data.routeVersion.versionNo}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">版本状态</p>
									<Badge variant={data.routeVersion.status === "READY" ? "default" : "outline"}>
										{data.routeVersion.status}
									</Badge>
								</div>
							</div>
						) : (
							<p className="text-muted-foreground">未绑定路由版本</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>最近生产的产品</CardTitle>
						<CardDescription>显示最近更新的 20 个产品单元</CardDescription>
					</div>
					<Package className="h-5 w-5 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{data.recentUnits.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">暂无生产记录</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>序列号 (SN)</TableHead>
									<TableHead>当前步骤</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>更新时间</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recentUnits.map((unit) => (
									<TableRow key={unit.sn}>
										<TableCell className="font-mono">{unit.sn}</TableCell>
										<TableCell>
											<Badge variant="outline">Step {unit.currentStepNo}</Badge>
										</TableCell>
										<TableCell>{getUnitStatusBadge(unit.status)}</TableCell>
										<TableCell className="text-muted-foreground">
											{formatTime(unit.updatedAt)}
										</TableCell>
										<TableCell>
											<Button variant="ghost" size="sm" asChild>
												<Link to="/mes/trace" search={{ sn: unit.sn }}>
													追溯
												</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
