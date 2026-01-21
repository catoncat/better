import { Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAbility } from "@/hooks/use-ability";
import { useLines, useUpdateLineProcessType } from "@/hooks/use-lines";
import {
	ALL_READINESS_ITEM_TYPES,
	READINESS_ITEM_TYPE_LABELS,
	type ReadinessItemType,
	useReadinessConfig,
	useUpdateReadinessConfig,
} from "@/hooks/use-readiness";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/mes/readiness-config")({
	component: ReadinessConfigPage,
});

function ReadinessConfigPage() {
	type ProcessType = keyof typeof PROCESS_TYPE_MAP;

	const { hasPermission } = useAbility();
	const canViewReadiness = hasPermission(Permission.READINESS_VIEW);
	const canEditReadiness = hasPermission(Permission.READINESS_CONFIG);
	const canViewLines = hasPermission(Permission.RUN_READ) && hasPermission(Permission.RUN_CREATE);
	const { data: linesData, isLoading: linesLoading } = useLines({ enabled: canViewLines });
	const [selectedLineId, setSelectedLineId] = useState<string>("");
	const [enabledTypes, setEnabledTypes] = useState<Set<ReadinessItemType>>(new Set());
	const [hasChanges, setHasChanges] = useState(false);
	const [processType, setProcessType] = useState<ProcessType | "">("");
	const [processTypeDirty, setProcessTypeDirty] = useState(false);

	const { data: configData, isLoading: configLoading } = useReadinessConfig(
		selectedLineId || undefined,
		{ enabled: canViewReadiness },
	);
	const updateConfig = useUpdateReadinessConfig();
	const updateProcessType = useUpdateLineProcessType();

	// Sync config data to local state
	useEffect(() => {
		if (configData) {
			setEnabledTypes(new Set(configData.enabled));
			setHasChanges(false);
		}
	}, [configData]);

	const lines = linesData?.items ?? [];
	const selectedLine = lines.find((line) => line.id === selectedLineId);

	useEffect(() => {
		if (selectedLine) {
			setProcessType(selectedLine.processType ?? "");
			setProcessTypeDirty(false);
		}
	}, [selectedLine]);

	const handleLineChange = (lineId: string) => {
		setSelectedLineId(lineId);
		setHasChanges(false);
	};

	const handleProcessTypeChange = (value: string) => {
		setProcessType(value as ProcessType);
		setProcessTypeDirty(true);
	};

	const handleToggle = (type: ReadinessItemType) => {
		if (!canEditReadiness) return;
		setEnabledTypes((prev) => {
			const next = new Set(prev);
			if (next.has(type)) {
				next.delete(type);
			} else {
				next.add(type);
			}
			return next;
		});
		setHasChanges(true);
	};

	const handleSelectAll = () => {
		if (!canEditReadiness) return;
		setEnabledTypes(new Set(ALL_READINESS_ITEM_TYPES));
		setHasChanges(true);
	};

	const handleClearAll = () => {
		if (!canEditReadiness) return;
		setEnabledTypes(new Set());
		setHasChanges(true);
	};

	const handleSave = async () => {
		if (!selectedLineId) return;
		await updateConfig.mutateAsync({
			lineId: selectedLineId,
			enabled: Array.from(enabledTypes),
		});
		setHasChanges(false);
	};

	const handleSaveProcessType = async () => {
		if (!selectedLineId || !processType) return;
		await updateProcessType.mutateAsync({ lineId: selectedLineId, processType });
		setProcessTypeDirty(false);
	};

	const header = (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">准备检查配置</h1>
				<p className="text-muted-foreground">配置各产线的准备检查项目</p>
			</div>
		</div>
	);

	if (!canViewReadiness) {
		return (
			<div className="space-y-6">
				{header}
				<NoAccessCard description="需要准备检查查看权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{header}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						检查项配置
					</CardTitle>
					<CardDescription>
						选择产线后，可配置该产线需要执行的准备检查类型。未配置时默认启用所有检查。
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{canViewLines ? (
						<>
							{/* Line selector */}
							<div className="space-y-2">
								<Label>选择产线</Label>
								<Select value={selectedLineId} onValueChange={handleLineChange}>
									<SelectTrigger className="w-64">
										<SelectValue placeholder={linesLoading ? "加载中..." : "选择产线"} />
									</SelectTrigger>
									<SelectContent>
										{lines.map((line) => (
											<SelectItem key={line.id} value={line.id}>
												{line.code} - {line.name}
												{line.processType
													? ` · ${PROCESS_TYPE_MAP[line.processType] ?? line.processType}`
													: ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>工艺类型</Label>
								<div className="flex flex-wrap items-center gap-2">
									<Select
										value={processType}
										onValueChange={handleProcessTypeChange}
										disabled={!canEditReadiness}
									>
										<SelectTrigger className="w-64">
											<SelectValue placeholder="选择工艺类型" />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Can permissions={Permission.READINESS_CONFIG}>
										<Button
											variant="outline"
											size="sm"
											onClick={handleSaveProcessType}
											disabled={
												!selectedLineId ||
												!processType ||
												!processTypeDirty ||
												updateProcessType.isPending
											}
										>
											{updateProcessType.isPending ? "保存中..." : "保存工艺"}
										</Button>
									</Can>
								</div>
								<p className="text-xs text-muted-foreground">
									工艺类型用于发布工单时校验产线与路由是否匹配。
								</p>
							</div>

							{/* Config panel */}
							{selectedLineId &&
								(configLoading ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									</div>
								) : (
									<div className="space-y-4">
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={handleSelectAll}
												disabled={!canEditReadiness}
											>
												全选
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={handleClearAll}
												disabled={!canEditReadiness}
											>
												清空
											</Button>
										</div>

										<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
											{ALL_READINESS_ITEM_TYPES.map((type) => (
												<div
													key={type}
													className="flex items-center space-x-3 rounded-lg border p-4"
												>
													<Checkbox
														id={type}
														checked={enabledTypes.has(type)}
														onCheckedChange={() => handleToggle(type)}
														disabled={!canEditReadiness}
													/>
													<Label
														htmlFor={type}
														className="flex-1 cursor-pointer text-sm font-medium"
													>
														{READINESS_ITEM_TYPE_LABELS[type]}
													</Label>
												</div>
											))}
										</div>

										<Can permissions={Permission.READINESS_CONFIG}>
											<div className="flex justify-end pt-4">
												<Button
													onClick={handleSave}
													disabled={!hasChanges || updateConfig.isPending}
												>
													{updateConfig.isPending ? (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													) : (
														<Check className="mr-2 h-4 w-4" />
													)}
													保存配置
												</Button>
											</div>
										</Can>
									</div>
								))}

							{!selectedLineId && (
								<div className="py-8 text-center text-muted-foreground">请先选择一个产线</div>
							)}
						</>
					) : (
						<NoAccessCard description="需要批次权限才能选择产线并配置检查项。" />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
