import { Permission } from "@better-app/db/permissions";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { Edit2, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field-wrapper";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAbility } from "@/hooks/use-ability";
import {
	type ExecutionConfig,
	useCreateExecutionConfig,
	useExecutionConfigs,
	useUpdateExecutionConfig,
} from "@/hooks/use-execution-configs";
import { useFaiTemplateList } from "@/hooks/use-fai-templates";
import { useCompileRouteVersion } from "@/hooks/use-route-versions";
import {
	useRouteDetail,
	useUpdateRouteFaiTemplate,
	useUpdateRouteProcessType,
} from "@/hooks/use-routes";
import { useStations } from "@/hooks/use-station-execution";
import { useStationGroups } from "@/hooks/use-station-groups";
import { PROCESS_TYPE_MAP } from "@/lib/constants";
import { client, unwrap } from "@/lib/eden";
import { DataSpecSelector } from "../-components/data-spec-selector";

export const Route = createFileRoute("/_authenticated/mes/routes/$routingCode")({
	component: RouteDetailPage,
});

const stationTypeOptions = [
	{ value: "MANUAL", label: "手动" },
	{ value: "AUTO", label: "自动" },
	{ value: "BATCH", label: "批处理" },
	{ value: "TEST", label: "测试" },
];

const stationTypeEnum = z.enum(["AUTO", "BATCH", "MANUAL", "TEST"]);

const configSchema = z
	.object({
		scopeType: z.enum(["ROUTE", "STEP"]),
		stepNo: z.string().optional(),
		stationType: z.union([stationTypeEnum, z.literal("")]).optional(),
		stationGroupCode: z.string().optional(),
		allowedStationIds: z.array(z.string()).optional(),
		requiresFAI: z.boolean().optional(),
		requiresAuthorization: z.boolean().optional(),
		dataSpecIds: z.array(z.string()).optional(),
		ingestMappingText: z.string().optional(),
		metaText: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.scopeType === "STEP" && !data.stepNo) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stepNo"], message: "请选择步骤" });
		}

		const ingestMappingText = data.ingestMappingText?.trim();
		if (ingestMappingText) {
			try {
				JSON.parse(ingestMappingText);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["ingestMappingText"],
					message: "JSON 格式不正确",
				});
			}
		}

		const metaText = data.metaText?.trim();
		if (metaText) {
			try {
				JSON.parse(metaText);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["metaText"],
					message: "JSON 格式不正确",
				});
			}
		}
	});

type ConfigFormValues = z.infer<typeof configSchema>;

type StationOption = {
	id: string;
	code: string;
	name: string;
};

function RouteDetailPage() {
	type ProcessType = keyof typeof PROCESS_TYPE_MAP;

	const { routingCode } = useParams({ from: "/_authenticated/mes/routes/$routingCode" });
	const queryClient = useQueryClient();
	const { hasPermission } = useAbility();
	const canViewRoutes = hasPermission(Permission.ROUTE_READ);
	const canViewDataSpecs =
		hasPermission(Permission.DATA_SPEC_READ) || hasPermission(Permission.DATA_SPEC_CONFIG);
	const canViewFaiTemplates = hasPermission(Permission.QUALITY_FAI);
	const canConfigureRoute = hasPermission(Permission.ROUTE_CONFIGURE);

	const {
		data: routeDetail,
		isLoading,
		refetch,
	} = useRouteDetail(routingCode, {
		enabled: canViewRoutes,
	});
	const updateProcessType = useUpdateRouteProcessType(routingCode);
	const updateFaiTemplate = useUpdateRouteFaiTemplate(routingCode);
	const { data: configs, isLoading: configsLoading } = useExecutionConfigs(routingCode, {
		enabled: canViewRoutes,
	});
	const { data: stationList } = useStations({ enabled: canViewRoutes });
	const { data: stationGroups } = useStationGroups({ enabled: canViewRoutes });
	const { mutateAsync: compileRoute, isPending: isCompiling } = useCompileRouteVersion();

	const { data: faiTemplateList, isLoading: isFaiTemplateLoading } = useFaiTemplateList(
		{
			page: 1,
			pageSize: 50,
			productCode: routeDetail?.route.productCode ?? undefined,
			processType: routeDetail?.route.processType ?? undefined,
			isActive: "true",
		},
		{ enabled: canViewFaiTemplates && Boolean(routeDetail?.route) },
	);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingConfig, setEditingConfig] = useState<ExecutionConfig | null>(null);
	const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
	const [processType, setProcessType] = useState<ProcessType | "">("");
	const [processTypeDirty, setProcessTypeDirty] = useState(false);
	const [faiTemplateId, setFaiTemplateId] = useState("");
	const [faiTemplateDirty, setFaiTemplateDirty] = useState(false);

	const steps = routeDetail?.steps ?? [];
	const executionConfigs = configs ?? [];
	const requiresFai = steps.some((step) => step.requiresFAI);
	const stationOptions: StationOption[] =
		stationList?.items.map((item) => ({
			id: item.id,
			code: item.code,
			name: item.name,
		})) ?? [];

	const stationGroupOptions =
		stationGroups?.items.map((group) => ({
			value: group.code,
			label: `${group.code} · ${group.name}`,
		})) ?? [];

	const stationById = useMemo(() => {
		const map = new Map<string, StationOption>();
		for (const station of stationOptions) {
			map.set(station.id, station);
		}
		return map;
	}, [stationOptions]);

	const templateOptions = useMemo(() => {
		const options =
			faiTemplateList?.items.map((template) => ({
				value: template.id,
				label: `${template.name} (${template.code}) · ${template.productCode}${
					template.version ? ` · ${template.version}` : ""
				}`,
			})) ?? [];

		const boundTemplate = routeDetail?.route.faiTemplate;
		if (boundTemplate && !options.some((option) => option.value === boundTemplate.id)) {
			options.unshift({
				value: boundTemplate.id,
				label: `${boundTemplate.name} (${boundTemplate.code}) · ${boundTemplate.productCode}${
					boundTemplate.version ? ` · ${boundTemplate.version}` : ""
				}${boundTemplate.isActive ? "" : " · 已停用"}`,
			});
		}

		return options;
	}, [faiTemplateList?.items, routeDetail?.route.faiTemplate]);

	const stepOptions = useMemo(
		() =>
			steps.map((step) => ({
				value: String(step.stepNo),
				label: `Step ${step.stepNo} · ${step.operationName}`,
				sourceStepKey: step.sourceStepKey,
				operationCode: step.operationCode,
			})),
		[steps],
	);

	const handleOpenCreate = () => {
		setEditingConfig(null);
		setDialogOpen(true);
	};

	const handleOpenEdit = (config: ExecutionConfig) => {
		setEditingConfig(config);
		setDialogOpen(true);
	};

	const sourceSystem = routeDetail?.route.sourceSystem;
	const isErpRoute = sourceSystem === "ERP";

	useEffect(() => {
		if (routeDetail?.route.processType) {
			setProcessType(routeDetail.route.processType);
			setProcessTypeDirty(false);
		}
	}, [routeDetail?.route.processType]);

	useEffect(() => {
		const currentTemplateId = routeDetail?.route.faiTemplate?.id ?? "";
		setFaiTemplateId(currentTemplateId);
		setFaiTemplateDirty(false);
	}, [routeDetail?.route.faiTemplate?.id]);

	const handleProcessTypeChange = (value: string) => {
		setProcessType(value as ProcessType);
		setProcessTypeDirty(true);
	};

	const handleSaveProcessType = async () => {
		if (!processType) return;
		await updateProcessType.mutateAsync({ processType });
		setProcessTypeDirty(false);
	};

	const handleFaiTemplateChange = (value: string) => {
		setFaiTemplateId(value);
		setFaiTemplateDirty(value !== (routeDetail?.route.faiTemplate?.id ?? ""));
	};

	const handleClearFaiTemplate = () => {
		setFaiTemplateId("");
		setFaiTemplateDirty(true);
	};

	const handleSaveFaiTemplate = async () => {
		await updateFaiTemplate.mutateAsync({ faiTemplateId: faiTemplateId || null });
		setFaiTemplateDirty(false);
	};

	const executionSemanticsStatus = useMemo(() => {
		const updatedAtMs = (config: ExecutionConfig) => {
			const ms = Date.parse(String(config.updatedAt));
			return Number.isFinite(ms) ? ms : 0;
		};

		const pickLatest = (items: ExecutionConfig[]) => {
			if (items.length === 0) return undefined;
			return items.reduce((latest, item) =>
				updatedAtMs(item) > updatedAtMs(latest) ? item : latest,
			);
		};

		const routeConfigs = executionConfigs.filter(
			(config) =>
				Boolean(config.routingId) &&
				!config.routingStepId &&
				!config.sourceStepKey &&
				!config.operationId,
		);
		const latestRouteConfig = pickLatest(routeConfigs);

		const missingConstraintStepNos: number[] = [];
		const missingIngestMappingStepNos: number[] = [];

		for (const step of steps) {
			const stepConfigs = executionConfigs.filter(
				(config) => config.routingStep?.stepNo === step.stepNo,
			);
			const sourceConfigs = step.sourceStepKey
				? executionConfigs.filter((config) => config.sourceStepKey === step.sourceStepKey)
				: [];

			const latestStepConfig = pickLatest([...stepConfigs, ...sourceConfigs]);

			const stationGroupMarker =
				latestStepConfig?.stationGroup?.code ??
				(latestStepConfig?.stationGroupId ? "__HAS__" : undefined) ??
				latestRouteConfig?.stationGroup?.code ??
				(latestRouteConfig?.stationGroupId ? "__HAS__" : undefined) ??
				step.stationGroupCode ??
				null;

			const allowedStationIdsRaw =
				latestStepConfig?.allowedStationIds ?? latestRouteConfig?.allowedStationIds ?? null;
			const allowedStationIds = normalizeStringArray(allowedStationIdsRaw);

			if (!stationGroupMarker && allowedStationIds.length === 0) {
				missingConstraintStepNos.push(step.stepNo);
			}

			const stationType =
				latestStepConfig?.stationType ?? latestRouteConfig?.stationType ?? step.stationType;
			const ingestMapping =
				latestStepConfig?.ingestMapping ?? latestRouteConfig?.ingestMapping ?? null;

			if (
				(stationType === "AUTO" || stationType === "BATCH" || stationType === "TEST") &&
				!ingestMapping
			) {
				missingIngestMappingStepNos.push(step.stepNo);
			}
		}

		const stepLabel =
			missingConstraintStepNos.length > 0
				? missingConstraintStepNos.map((no) => `Step ${no}`).join(", ")
				: null;

		const mappingLabel =
			missingIngestMappingStepNos.length > 0
				? missingIngestMappingStepNos.map((no) => `Step ${no}`).join(", ")
				: null;

		return {
			isReady: missingConstraintStepNos.length === 0 && missingIngestMappingStepNos.length === 0,
			missingConstraintStepNos,
			missingIngestMappingStepNos,
			stepLabel,
			mappingLabel,
		};
	}, [executionConfigs, steps]);

	const handleCompile = async () => {
		if (executionSemanticsStatus.missingConstraintStepNos.length > 0) {
			toast.warning("执行语义未就绪", {
				description: `${executionSemanticsStatus.stepLabel ?? ""} 缺少站点组/允许站点，编译可能生成 INVALID 版本。`,
			});
		}
		try {
			await compileRoute(routingCode);
		} catch {
			// handled by mutation onError toast
		}
	};

	const handleBulkApplyStationGroup = async (stationGroupCode: string) => {
		const missingStepNos = executionSemanticsStatus.missingConstraintStepNos;
		if (!stationGroupCode || missingStepNos.length === 0) return;

		const failures: Array<{ stepNo: number; message: string }> = [];

		for (const stepNo of missingStepNos) {
			try {
				const response = await client.api.routes({ routingCode })["execution-config"].post({
					scopeType: "STEP",
					stepNo,
					stationGroupCode,
				});
				unwrap(response);
			} catch (error) {
				failures.push({
					stepNo,
					message: error instanceof Error ? error.message : "未知错误",
				});
			}
		}

		queryClient.invalidateQueries({ queryKey: ["mes", "execution-configs", routingCode] });

		if (failures.length === 0) {
			toast.success("站点组已批量配置", {
				description: `已为 ${missingStepNos.length} 个步骤创建执行配置`,
			});
			setBulkDialogOpen(false);
			return;
		}

		const first = failures[0];
		toast.error("批量配置部分失败", {
			description: `Step ${first.stepNo}: ${first.message}`,
		});
	};

	const header = (
		<div>
			<h1 className="text-3xl font-bold tracking-tight">路由详情</h1>
			<p className="text-muted-foreground">查看工艺路线步骤并维护执行语义配置。</p>
		</div>
	);

	if (!canViewRoutes) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要路由查看权限才能查看路由详情。" />
			</div>
		);
	}

	if (isLoading) {
		return <div className="text-sm text-muted-foreground">加载路由详情中...</div>;
	}

	if (!routeDetail) {
		return <div className="text-sm text-muted-foreground">未找到路由。</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				{header}
				<div className="flex flex-wrap gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								variant={executionSemanticsStatus.isReady ? "secondary" : "outline"}
								className={
									executionSemanticsStatus.isReady
										? undefined
										: "border-amber-200 bg-amber-50 text-amber-700"
								}
							>
								{executionSemanticsStatus.isReady
									? "执行语义 READY"
									: `执行语义缺失 (${executionSemanticsStatus.missingConstraintStepNos.length + executionSemanticsStatus.missingIngestMappingStepNos.length})`}
							</Badge>
						</TooltipTrigger>
						<TooltipContent sideOffset={6}>
							{executionSemanticsStatus.isReady ? (
								<span>可直接编译生成 READY 版本。</span>
							) : (
								<div className="space-y-1">
									{executionSemanticsStatus.missingConstraintStepNos.length > 0 && (
										<p>{executionSemanticsStatus.stepLabel} 缺少站点约束。</p>
									)}
									{executionSemanticsStatus.missingIngestMappingStepNos.length > 0 && (
										<p>
											{executionSemanticsStatus.mappingLabel}{" "}
											缺少采集映射（自动/批处理/测试工序必填）。
										</p>
									)}
									<p className="text-xs opacity-80">当前状态编译会得到 INVALID。</p>
								</div>
							)}
						</TooltipContent>
					</Tooltip>
					<Button variant="secondary" onClick={() => refetch()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						刷新
					</Button>
					<Can permissions={Permission.ROUTE_COMPILE}>
						<Button onClick={handleCompile} disabled={isCompiling}>
							{isCompiling ? "编译中..." : "编译路由"}
						</Button>
					</Can>
				</div>
			</div>

			{isErpRoute && (
				<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
					该路由来自 ERP，步骤顺序只读；可在下方配置执行语义。
				</div>
			)}

			{!executionSemanticsStatus.isReady && (
				<div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div className="space-y-1">
							<p className="font-medium">此路由尚未配置完整执行语义</p>
							{executionSemanticsStatus.missingConstraintStepNos.length > 0 && (
								<p className="text-amber-900/80">
									站点约束缺失：{executionSemanticsStatus.stepLabel}。
								</p>
							)}
							{executionSemanticsStatus.missingIngestMappingStepNos.length > 0 && (
								<p className="text-amber-900/80">
									采集映射缺失：{executionSemanticsStatus.mappingLabel}。
								</p>
							)}
							<p className="text-amber-900/60 text-xs">
								未满足编译必要条件，生成版本将为 INVALID。
							</p>
						</div>
						{executionSemanticsStatus.missingConstraintStepNos.length > 0 && (
							<Can permissions={Permission.ROUTE_CONFIGURE}>
								<Button
									size="sm"
									variant="outline"
									className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
									onClick={() => setBulkDialogOpen(true)}
									disabled={stationGroupOptions.length === 0}
								>
									快速为缺失步骤配置站点组
								</Button>
							</Can>
						)}
					</div>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>路由信息</CardTitle>
					<CardDescription>基础信息与来源。</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div>
						<p className="text-sm text-muted-foreground">路由编码</p>
						<p className="font-medium">{routeDetail.route.code}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">名称</p>
						<p className="font-medium">{routeDetail.route.name}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">产品编码</p>
						<p className="font-medium">{routeDetail.route.productCode || "-"}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">来源</p>
						<Badge variant={isErpRoute ? "outline" : "secondary"}>
							{routeDetail.route.sourceSystem}
						</Badge>
					</div>
					<div className="md:col-span-2">
						<p className="text-sm text-muted-foreground">工艺类型</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<Select value={processType} onValueChange={handleProcessTypeChange}>
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
							<Can permissions={Permission.ROUTE_CONFIGURE}>
								<Button
									variant="outline"
									size="sm"
									onClick={handleSaveProcessType}
									disabled={!processType || !processTypeDirty || updateProcessType.isPending}
								>
									{updateProcessType.isPending ? "保存中..." : "保存工艺"}
								</Button>
							</Can>
						</div>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">有效期</p>
						<p className="font-medium">
							{routeDetail.route.effectiveFrom
								? format(new Date(routeDetail.route.effectiveFrom), "yyyy-MM-dd")
								: "-"}
							{"  "}~{"  "}
							{routeDetail.route.effectiveTo
								? format(new Date(routeDetail.route.effectiveTo), "yyyy-MM-dd")
								: "-"}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">最近更新</p>
						<p className="font-medium">
							{format(new Date(routeDetail.route.updatedAt), "yyyy-MM-dd HH:mm")}
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>首件检验模板</CardTitle>
					<CardDescription>用于首件检验项目的模板绑定。</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-[1fr_auto]">
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">模板选择</p>
							{canViewFaiTemplates ? (
								<Combobox
									options={templateOptions}
									value={faiTemplateId}
									onValueChange={handleFaiTemplateChange}
									placeholder={isFaiTemplateLoading ? "加载中..." : "选择 FAI 模板"}
									searchPlaceholder="搜索模板"
									emptyText={isFaiTemplateLoading ? "加载中..." : "暂无可用模板"}
									disabled={!canConfigureRoute}
								/>
							) : (
								<p className="text-sm text-muted-foreground">需要首件检验权限才能选择模板。</p>
							)}
							{routeDetail.route.faiTemplate ? (
								<p className="text-xs text-muted-foreground">
									当前绑定：{routeDetail.route.faiTemplate.name}（
									{routeDetail.route.faiTemplate.code}）
								</p>
							) : (
								<p className="text-xs text-muted-foreground">当前未绑定模板</p>
							)}
						</div>
						<div className="flex items-center gap-2 md:justify-end">
							{faiTemplateId ? (
								<Button
									variant="outline"
									size="sm"
									onClick={handleClearFaiTemplate}
									disabled={!canConfigureRoute}
								>
									清空绑定
								</Button>
							) : null}
							<Can permissions={Permission.ROUTE_CONFIGURE}>
								<Button
									size="sm"
									onClick={handleSaveFaiTemplate}
									disabled={!faiTemplateDirty || updateFaiTemplate.isPending}
								>
									{updateFaiTemplate.isPending ? "保存中..." : "保存模板"}
								</Button>
							</Can>
						</div>
					</div>
					{requiresFai && !routeDetail.route.faiTemplate && (
						<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
							该路由包含需要首件检验的步骤，请先绑定模板并重新编译。
							<Link
								to="/mes/fai-templates"
								className="ml-2 text-amber-900 underline underline-offset-4"
							>
								去配置模板
							</Link>
						</div>
					)}
					{!requiresFai && (
						<p className="text-xs text-muted-foreground">当前步骤未要求 FAI，可按需绑定模板。</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>步骤列表</CardTitle>
					<CardDescription>ERP 路由步骤与站点建议。</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>步骤</TableHead>
								<TableHead>工序</TableHead>
								<TableHead>站点组</TableHead>
								<TableHead>站点类型</TableHead>
								<TableHead>FAI</TableHead>
								<TableHead>来源步骤</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{steps.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center text-muted-foreground">
										暂无步骤
									</TableCell>
								</TableRow>
							) : (
								steps.map((step) => (
									<TableRow key={step.stepNo}>
										<TableCell className="font-medium">Step {step.stepNo}</TableCell>
										<TableCell>
											{step.operationName} ({step.operationCode})
										</TableCell>
										<TableCell>
											{step.stationGroupName
												? `${step.stationGroupName}`
												: step.stationGroupCode || "-"}
										</TableCell>
										<TableCell>{step.stationType}</TableCell>
										<TableCell>{step.requiresFAI ? "是" : "否"}</TableCell>
										<TableCell className="text-muted-foreground">
											{step.sourceStepKey || "-"}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle>执行语义配置</CardTitle>
						<CardDescription>控制站点范围、数据采集与授权要求。</CardDescription>
					</div>
					<Can permissions={Permission.ROUTE_CONFIGURE}>
						<Button size="sm" onClick={handleOpenCreate}>
							<PlusCircle className="mr-2 h-4 w-4" />
							新增配置
						</Button>
					</Can>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>范围</TableHead>
								<TableHead>站点类型</TableHead>
								<TableHead>站点组</TableHead>
								<TableHead>允许站点</TableHead>
								<TableHead>采集项</TableHead>
								<TableHead>更新时间</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{configsLoading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center text-muted-foreground">
										加载中...
									</TableCell>
								</TableRow>
							) : configs && configs.length > 0 ? (
								configs.map((config) => {
									const matchedStepNo =
										config.routingStep?.stepNo ??
										(config.sourceStepKey
											? steps.find((step) => step.sourceStepKey === config.sourceStepKey)?.stepNo
											: undefined);
									const scopeLabel = config.routingId
										? "全局默认"
										: matchedStepNo
											? `Step ${matchedStepNo}`
											: "未知范围";
									const allowedIds = normalizeStringArray(config.allowedStationIds);
									const allowedLabels = allowedIds
										.map((id) => stationById.get(id)?.code)
										.filter(Boolean)
										.join(", ");
									const dataSpecCount = normalizeStringArray(config.dataSpecIds).length;

									return (
										<TableRow key={config.id}>
											<TableCell className="font-medium">{scopeLabel}</TableCell>
											<TableCell>{config.stationType || "-"}</TableCell>
											<TableCell>
												{config.stationGroup
													? `${config.stationGroup.code} · ${config.stationGroup.name}`
													: "-"}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{allowedLabels || "-"}
											</TableCell>
											<TableCell>{dataSpecCount ? `${dataSpecCount} 项` : "-"}</TableCell>
											<TableCell>
												{format(new Date(config.updatedAt), "yyyy-MM-dd HH:mm")}
											</TableCell>
											<TableCell>
												<Can permissions={Permission.ROUTE_CONFIGURE}>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleOpenEdit(config)}
													>
														<Edit2 className="h-4 w-4" />
													</Button>
												</Can>
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={7} className="text-center text-muted-foreground">
										{executionSemanticsStatus.missingConstraintStepNos.length > 0
											? "暂无配置（缺少站点组/允许站点，编译会得到 INVALID）"
											: "暂无配置"}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<ExecutionConfigDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editingConfig={editingConfig}
				routingCode={routingCode}
				stepOptions={stepOptions}
				stationGroupOptions={stationGroupOptions}
				stations={stationOptions}
				canViewDataSpecs={canViewDataSpecs}
			/>

			<BulkStationGroupDialog
				open={bulkDialogOpen}
				onOpenChange={setBulkDialogOpen}
				stationGroupOptions={stationGroupOptions}
				missingStepNos={executionSemanticsStatus.missingConstraintStepNos}
				onConfirm={handleBulkApplyStationGroup}
			/>
		</div>
	);
}

function BulkStationGroupDialog({
	open,
	onOpenChange,
	stationGroupOptions,
	missingStepNos,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stationGroupOptions: Array<{ value: string; label: string }>;
	missingStepNos: number[];
	onConfirm: (stationGroupCode: string) => Promise<void>;
}) {
	const [stationGroupCode, setStationGroupCode] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			setStationGroupCode("");
			setIsSubmitting(false);
		}
	}, [open]);

	const missingLabel =
		missingStepNos.length > 0 ? missingStepNos.map((no) => `Step ${no}`).join(", ") : "无";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle>快速配置站点组</DialogTitle>
					<DialogDescription>
						为缺少站点约束的步骤批量创建 STEP 级执行配置：{missingLabel}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
					<div className="space-y-2">
						<p className="text-sm font-medium">站点组</p>
						<Combobox
							options={stationGroupOptions}
							value={stationGroupCode}
							onValueChange={setStationGroupCode}
							placeholder="选择站点组"
							searchPlaceholder="搜索站点组"
							emptyText="未找到站点组"
						/>
					</div>
				</div>

				<DialogFooter className="shrink-0 border-t border-border pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						取消
					</Button>
					<Button
						onClick={async () => {
							if (!stationGroupCode) {
								toast.error("请选择站点组");
								return;
							}
							if (missingStepNos.length === 0) {
								toast.message("没有需要配置的步骤");
								onOpenChange(false);
								return;
							}
							setIsSubmitting(true);
							try {
								await onConfirm(stationGroupCode);
							} finally {
								setIsSubmitting(false);
							}
						}}
						disabled={!stationGroupCode || isSubmitting || missingStepNos.length === 0}
					>
						{isSubmitting ? "配置中..." : "确认配置"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ExecutionConfigDialog({
	open,
	onOpenChange,
	editingConfig,
	routingCode,
	stepOptions,
	stationGroupOptions,
	stations,
	canViewDataSpecs,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingConfig: ExecutionConfig | null;
	routingCode: string;
	stepOptions: Array<{
		value: string;
		label: string;
		sourceStepKey: string | null;
		operationCode: string;
	}>;
	stationGroupOptions: Array<{ value: string; label: string }>;
	stations: StationOption[];
	canViewDataSpecs: boolean;
}) {
	const { hasPermission } = useAbility();
	const isEdit = Boolean(editingConfig);
	const createMutation = useCreateExecutionConfig(routingCode);
	const updateMutation = useUpdateExecutionConfig(routingCode, editingConfig?.id ?? "");

	const resolvedScopeType = useMemo(() => {
		if (editingConfig?.routingStepId || editingConfig?.sourceStepKey) return "STEP";
		return "ROUTE";
	}, [editingConfig]);

	const stationGroupCode =
		editingConfig?.stationGroup?.code ?? (editingConfig?.stationGroupId ? "" : "");

	const defaultValues: ConfigFormValues = {
		scopeType: resolvedScopeType,
		stepNo: editingConfig?.routingStep?.stepNo ? String(editingConfig.routingStep.stepNo) : "",
		stationType: editingConfig?.stationType ?? "",
		stationGroupCode: stationGroupCode ?? "",
		allowedStationIds: normalizeStringArray(editingConfig?.allowedStationIds ?? null),
		requiresFAI: editingConfig?.requiresFAI ?? false,
		requiresAuthorization: editingConfig?.requiresAuthorization ?? false,
		dataSpecIds: normalizeStringArray(editingConfig?.dataSpecIds ?? null),
		ingestMappingText: editingConfig?.ingestMapping
			? JSON.stringify(editingConfig.ingestMapping, null, 2)
			: "",
		metaText: editingConfig?.meta ? JSON.stringify(editingConfig.meta, null, 2) : "",
	};

	const form = useForm({
		defaultValues,
		validators: {
			onChange: configSchema,
		},
		onSubmit: async ({ value: values }) => {
			const dataSpecIds = values.dataSpecIds ?? [];
			const ingestMapping = parseJson(values.ingestMappingText);
			const meta = parseJson(values.metaText);

			if (values.ingestMappingText && ingestMapping === null) return;
			if (values.metaText && meta === null) return;

			const stationGroupCode =
				values.stationGroupCode === "__NONE__" ? null : values.stationGroupCode || undefined;
			const stationType = values.stationType || undefined;

			if (isEdit && editingConfig) {
				await updateMutation.mutateAsync({
					stationType,
					stationGroupCode,
					allowedStationIds: values.allowedStationIds?.length ? values.allowedStationIds : null,
					requiresFAI: values.requiresFAI ?? undefined,
					requiresAuthorization: values.requiresAuthorization ?? undefined,
					dataSpecIds: dataSpecIds.length ? dataSpecIds : null,
					ingestMapping: ingestMapping ?? null,
					meta: meta ?? null,
				});
				onOpenChange(false);
				return;
			}

			await createMutation.mutateAsync({
				scopeType: values.scopeType,
				stepNo: values.stepNo ? Number(values.stepNo) : undefined,
				stationType,
				stationGroupCode,
				allowedStationIds: values.allowedStationIds?.length ? values.allowedStationIds : null,
				requiresFAI: values.requiresFAI ?? undefined,
				requiresAuthorization: values.requiresAuthorization ?? undefined,
				dataSpecIds: dataSpecIds.length ? dataSpecIds : null,
				ingestMapping: ingestMapping ?? null,
				meta: meta ?? null,
			});
			onOpenChange(false);
		},
	});

	useEffect(() => {
		form.reset({
			scopeType: resolvedScopeType,
			stepNo: editingConfig?.routingStep?.stepNo ? String(editingConfig.routingStep.stepNo) : "",
			stationType: editingConfig?.stationType ?? "",
			stationGroupCode: stationGroupCode ?? "",
			allowedStationIds: normalizeStringArray(editingConfig?.allowedStationIds ?? null),
			requiresFAI: editingConfig?.requiresFAI ?? false,
			requiresAuthorization: editingConfig?.requiresAuthorization ?? false,
			dataSpecIds: normalizeStringArray(editingConfig?.dataSpecIds ?? null),
			ingestMappingText: editingConfig?.ingestMapping
				? JSON.stringify(editingConfig.ingestMapping, null, 2)
				: "",
			metaText: editingConfig?.meta ? JSON.stringify(editingConfig.meta, null, 2) : "",
		});
	}, [editingConfig, form, resolvedScopeType, stationGroupCode]);

	useEffect(() => {
		if (open && !editingConfig) {
			form.reset({
				scopeType: "ROUTE",
				stepNo: "",
				stationType: "",
				stationGroupCode: "",
				allowedStationIds: [],
				requiresFAI: false,
				requiresAuthorization: false,
				dataSpecIds: [],
				ingestMappingText: "",
				metaText: "",
			});
		}
	}, [editingConfig, form, open]);

	const stepOptionsForSelect = stepOptions.map((option) => ({
		value: option.value,
		label: option.label,
	}));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle>{isEdit ? "编辑执行配置" : "新增执行配置"}</DialogTitle>
					<DialogDescription>定义站点类型、站点组以及采集项等规则。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col min-h-0 gap-4"
				>
					<div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<Field
								form={form}
								name="scopeType"
								label="配置范围"
								description="推荐：全局默认 + 按步骤覆盖。"
							>
								{(field) => (
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as ConfigFormValues["scopeType"])
										}
										disabled={isEdit}
									>
										<SelectTrigger>
											<SelectValue placeholder="选择范围" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ROUTE">全局默认（整条路由）</SelectItem>
											<SelectItem value="STEP">按步骤覆盖</SelectItem>
										</SelectContent>
									</Select>
								)}
							</Field>

							<form.Subscribe selector={(state) => state.values.scopeType}>
								{(scopeType) => (
									<>
										{scopeType === "STEP" && (
											<Field form={form} name="stepNo" label="步骤">
												{(field) => (
													<Select
														value={field.state.value || ""}
														onValueChange={field.handleChange}
														disabled={isEdit}
													>
														<SelectTrigger>
															<SelectValue placeholder="选择步骤" />
														</SelectTrigger>
														<SelectContent>
															{stepOptionsForSelect.map((option) => (
																<SelectItem key={option.value} value={option.value}>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											</Field>
										)}
									</>
								)}
							</form.Subscribe>

							<Field form={form} name="stationType" label="站点类型">
								{(field) => (
									<Select
										value={field.state.value || ""}
										onValueChange={(value) =>
											field.handleChange(value as ConfigFormValues["stationType"])
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="选择站点类型" />
										</SelectTrigger>
										<SelectContent>
											{stationTypeOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</Field>

							<Field form={form} name="stationGroupCode" label="站点组">
								{(field) => (
									<Combobox
										options={[{ value: "__NONE__", label: "不指定站点组" }, ...stationGroupOptions]}
										value={field.state.value || ""}
										onValueChange={field.handleChange}
										placeholder="选择站点组"
										searchPlaceholder="搜索站点组"
										emptyText="未找到站点组"
									/>
								)}
							</Field>
						</div>

						<Field form={form} name="allowedStationIds" label="允许站点">
							{(field) => (
								<div className="max-h-48 overflow-auto rounded-md border border-border p-3 space-y-2">
									{stations.length === 0 ? (
										<div className="text-sm text-muted-foreground">暂无工位数据</div>
									) : (
										stations.map((station) => {
											const checked = (field.state.value ?? []).includes(station.id);
											const checkboxId = `station-${station.id}`;
											return (
												<div key={station.id} className="flex items-center gap-2 text-sm">
													<Checkbox
														id={checkboxId}
														checked={checked}
														onCheckedChange={(value) => {
															const next = new Set(field.state.value ?? []);
															if (value) {
																next.add(station.id);
															} else {
																next.delete(station.id);
															}
															field.handleChange(Array.from(next));
														}}
													/>
													<label htmlFor={checkboxId} className="cursor-pointer">
														{station.code} · {station.name}
													</label>
												</div>
											);
										})
									)}
								</div>
							)}
						</Field>

						<div className="grid gap-4 md:grid-cols-2">
							<Field form={form} name="requiresFAI" label="需要首件">
								{(field) => (
									<Select
										value={field.state.value ? "true" : "false"}
										onValueChange={(value) => field.handleChange(value === "true")}
									>
										<SelectTrigger>
											<SelectValue placeholder="选择" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="false">否</SelectItem>
											<SelectItem value="true">是</SelectItem>
										</SelectContent>
									</Select>
								)}
							</Field>
							<Field form={form} name="requiresAuthorization" label="需要授权">
								{(field) => (
									<Select
										value={field.state.value ? "true" : "false"}
										onValueChange={(value) => field.handleChange(value === "true")}
									>
										<SelectTrigger>
											<SelectValue placeholder="选择" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="false">否</SelectItem>
											<SelectItem value="true">是</SelectItem>
										</SelectContent>
									</Select>
								)}
							</Field>
						</div>

						{/* DataSpecSelector wrapped in form.Subscribe to get stepNo reactively */}
						<form.Subscribe selector={(state) => state.values.stepNo}>
							{(stepNo) => {
								const selectedOperationCode = stepNo
									? stepOptions.find((s) => s.value === stepNo)?.operationCode
									: undefined;
								return (
									<Field form={form} name="dataSpecIds" label="采集项">
										{(field) => (
											<DataSpecSelector
												value={field.state.value ?? []}
												onChange={field.handleChange}
												operationCode={selectedOperationCode}
												enabled={canViewDataSpecs}
											/>
										)}
									</Field>
								);
							}}
						</form.Subscribe>

						<div className="grid gap-4 md:grid-cols-2">
							<Field form={form} name="ingestMappingText" label="采集映射 (JSON)">
								{(field) => (
									<Textarea
										placeholder='例如 {"serial":"SN","result":"PASS"}'
										rows={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								)}
							</Field>
							<Field form={form} name="metaText" label="扩展信息 (JSON)">
								{(field) => (
									<Textarea
										placeholder='例如 {"note":"..."}'
										rows={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								)}
							</Field>
						</div>
					</div>

					<DialogFooter className="shrink-0 border-t border-border pt-4">
						<Button
							type="submit"
							disabled={
								createMutation.isPending ||
								updateMutation.isPending ||
								!hasPermission(Permission.ROUTE_CONFIGURE)
							}
						>
							{createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存配置"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function normalizeStringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}

function parseJson(value?: string) {
	if (!value) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}
