import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIntegrationStatus, useTriggerIntegrationSync } from "@/hooks/use-integration";

export const Route = createFileRoute("/_authenticated/system/integrations")({
	component: IntegrationSyncPage,
});

type JobDefinition = {
	sourceSystem: string;
	entityType: string;
	label: string;
	description: string;
};

const jobDefinitions: JobDefinition[] = [
	{
		sourceSystem: "ERP",
		entityType: "ROUTING",
		label: "工艺路线",
		description: "拉取 ENG_Route 并编译可执行版本",
	},
	{
		sourceSystem: "ERP",
		entityType: "WORK_ORDER",
		label: "工单",
		description: "同步工单与计划数据",
	},
	{
		sourceSystem: "ERP",
		entityType: "MATERIAL",
		label: "物料",
		description: "同步物料主数据",
	},
	{
		sourceSystem: "ERP",
		entityType: "BOM",
		label: "BOM",
		description: "同步产品 BOM 结构",
	},
	{
		sourceSystem: "ERP",
		entityType: "WORK_CENTER",
		label: "工作中心",
		description: "同步工作中心/部门映射",
	},
	{
		sourceSystem: "TPM",
		entityType: "EQUIPMENT",
		label: "设备主数据",
		description: "同步设备编码与状态",
	},
	{
		sourceSystem: "TPM",
		entityType: "STATUS_LOG",
		label: "设备状态日志",
		description: "用于执行门禁与可用性判断",
	},
	{
		sourceSystem: "TPM",
		entityType: "MAINTENANCE_TASK",
		label: "维护任务",
		description: "用于维护/维修阻断执行",
	},
];

function IntegrationSyncPage() {
	const { data, isLoading, isFetching, refetch } = useIntegrationStatus();
	const { mutateAsync: triggerSync, isPending } = useTriggerIntegrationSync();
	const [activeKey, setActiveKey] = useState<string | null>(null);

	const jobsByKey = useMemo(() => {
		const map = new Map<string, (typeof data)[number]>();
		(data ?? []).forEach((job) => {
			map.set(`${job.sourceSystem}:${job.entityType}`, job);
		});
		return map;
	}, [data]);

	const formatTime = (value?: string | null) => {
		if (!value) return "-";
		return format(new Date(value), "yyyy-MM-dd HH:mm");
	};

	const handleSync = async (job: JobDefinition) => {
		const key = `${job.sourceSystem}:${job.entityType}`;
		setActiveKey(key);
		try {
			await triggerSync({ sourceSystem: job.sourceSystem, entityType: job.entityType });
		} finally {
			setActiveKey(null);
		}
	};

	const renderJob = (job: JobDefinition) => {
		const key = `${job.sourceSystem}:${job.entityType}`;
		const status = jobsByKey.get(key);
		const isRunning = isPending && activeKey === key;

		return (
			<div key={key} className="rounded-lg border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center">
				<div className="flex-1 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-base font-semibold">{job.label}</span>
						<Badge variant={status?.lastCron?.status === "SUCCESS" ? "secondary" : "outline"}>
							{status?.lastCron?.status || "未执行"}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">{job.description}</p>
					<div className="text-sm text-muted-foreground space-y-1">
						<div>上次同步时间：{formatTime(status?.cursor?.lastSyncAt)}</div>
						<div>游标更新时间：{formatTime(status?.cursor?.updatedAt)}</div>
						<div>最近 Cron：{formatTime(status?.lastCron?.createdAt)}</div>
					</div>
				</div>
				<Button size="sm" onClick={() => handleSync(job)} disabled={isRunning}>
					{isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					手动同步
				</Button>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">集成同步</h1>
				<p className="text-muted-foreground">查看入站同步游标与最近执行结果，并可手动触发同步。</p>
			</div>

			<div className="flex justify-end">
				<Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
					{isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
					刷新状态
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>ERP 同步</CardTitle>
					<CardDescription>工单、物料与工艺路线等主数据。</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{jobDefinitions.filter((job) => job.sourceSystem === "ERP").map(renderJob)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>TPM 同步</CardTitle>
					<CardDescription>设备状态与维护数据。</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{jobDefinitions.filter((job) => job.sourceSystem === "TPM").map(renderJob)}
				</CardContent>
			</Card>

			{isLoading && (
				<div className="text-sm text-muted-foreground">正在加载同步状态...</div>
			)}
		</div>
	);
}
