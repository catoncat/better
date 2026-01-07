import { Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Can } from "@/components/ability/can";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type IntegrationJobStatus, useIntegrationStatus } from "@/hooks/use-integration-status";

export const Route = createFileRoute("/_authenticated/mes/integration/status")({
	component: IntegrationStatusPage,
});

const SOURCE_SYSTEM_LABELS: Record<string, string> = {
	ERP: "ERP 系统",
	TPM: "设备管理",
	WMS: "仓库管理",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
	ROUTING: "工艺路由",
	WORK_ORDER: "工单",
	MATERIAL: "物料",
	BOM: "物料清单",
	WORK_CENTER: "工作中心",
	EQUIPMENT: "设备",
	STATUS_LOG: "状态日志",
	MAINTENANCE_TASK: "维护任务",
};

function IntegrationStatusPage() {
	const { data, isLoading, refetch, isFetching } = useIntegrationStatus();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">集成状态监控</h1>
					<p className="text-muted-foreground">查看各外部系统集成同步状态</p>
				</div>
				<Can permissions={Permission.SYSTEM_INTEGRATION}>
					<Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
						{isFetching ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						刷新
					</Button>
				</Can>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>同步任务状态</CardTitle>
					<CardDescription>各数据源的定时同步任务执行情况</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>源系统</TableHead>
								<TableHead>实体类型</TableHead>
								<TableHead>最后同步</TableHead>
								<TableHead>同步游标</TableHead>
								<TableHead>最后执行</TableHead>
								<TableHead>状态</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
									</TableCell>
								</TableRow>
							) : !data?.jobs.length ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
										暂无同步任务
									</TableCell>
								</TableRow>
							) : (
								data.jobs.map((job) => (
									<JobRow key={`${job.sourceSystem}-${job.entityType}`} job={job} />
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

function JobRow({ job }: { job: IntegrationJobStatus }) {
	const sourceLabel = SOURCE_SYSTEM_LABELS[job.sourceSystem] || job.sourceSystem;
	const entityLabel = ENTITY_TYPE_LABELS[job.entityType] || job.entityType;

	const lastSyncAt = job.cursor?.lastSyncAt ? new Date(job.cursor.lastSyncAt) : null;
	const lastCronAt = job.lastCron?.createdAt ? new Date(job.lastCron.createdAt) : null;

	const cronStatus = job.lastCron?.status;
	const statusIcon =
		cronStatus === "SUCCESS" ? (
			<CheckCircle2 className="h-4 w-4 text-green-500" />
		) : cronStatus === "FAIL" ? (
			<XCircle className="h-4 w-4 text-red-500" />
		) : cronStatus === "RUNNING" ? (
			<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
		) : (
			<Clock className="h-4 w-4 text-muted-foreground" />
		);

	return (
		<TableRow>
			<TableCell>
				<Badge variant="outline">{sourceLabel}</Badge>
			</TableCell>
			<TableCell>{entityLabel}</TableCell>
			<TableCell>
				{lastSyncAt ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="cursor-help">
								{formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: zhCN })}
							</span>
						</TooltipTrigger>
						<TooltipContent>{lastSyncAt.toLocaleString("zh-CN")}</TooltipContent>
					</Tooltip>
				) : (
					<span className="text-muted-foreground">-</span>
				)}
			</TableCell>
			<TableCell>
				{job.cursor?.lastSeq ? (
					<code className="text-xs bg-muted px-1 py-0.5 rounded">{job.cursor.lastSeq}</code>
				) : (
					<span className="text-muted-foreground">-</span>
				)}
			</TableCell>
			<TableCell>
				{lastCronAt ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="cursor-help">
								{formatDistanceToNow(lastCronAt, { addSuffix: true, locale: zhCN })}
							</span>
						</TooltipTrigger>
						<TooltipContent>{lastCronAt.toLocaleString("zh-CN")}</TooltipContent>
					</Tooltip>
				) : (
					<span className="text-muted-foreground">从未执行</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					{statusIcon}
					<span className="text-sm">
						{cronStatus === "SUCCESS"
							? "成功"
							: cronStatus === "FAIL"
								? "失败"
								: cronStatus === "RUNNING"
									? "运行中"
									: "待执行"}
					</span>
				</div>
			</TableCell>
		</TableRow>
	);
}
