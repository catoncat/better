import { Permission } from "@better-app/db/permissions";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { Edit2, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { Can } from "@/components/ability/can";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { useAbility } from "@/hooks/use-ability";
import {
	type ExecutionConfig,
	useCreateExecutionConfig,
	useExecutionConfigs,
	useUpdateExecutionConfig,
} from "@/hooks/use-execution-configs";
import { useCompileRouteVersion } from "@/hooks/use-route-versions";
import { useRouteDetail } from "@/hooks/use-routes";
import { useStations } from "@/hooks/use-station-execution";
import { useStationGroups } from "@/hooks/use-station-groups";

export const Route = createFileRoute("/_authenticated/mes/routes/$routingCode")({
	component: RouteDetailPage,
});

const stationTypeOptions = [
	{ value: "MANUAL", label: "手动" },
	{ value: "AUTO", label: "自动" },
	{ value: "BATCH", label: "批处理" },
	{ value: "TEST", label: "测试" },
] as const;

type ScopeType = "ROUTE" | "OPERATION" | "STEP" | "SOURCE_STEP";
type StationType = "AUTO" | "BATCH" | "MANUAL" | "TEST" | "";

const configSchema = z
	.object({
		scopeType: z.enum(["ROUTE", "OPERATION", "STEP", "SOURCE_STEP"]),
		stepNo: z.string(),
		sourceStepKey: z.string(),
		operationCode: z.string(),
		stationType: z.enum(["AUTO", "BATCH", "MANUAL", "TEST", ""]),
		stationGroupCode: z.string(),
		allowedStationIds: z.array(z.string()),
		requiresFAI: z.boolean(),
		requiresAuthorization: z.boolean(),
		dataSpecIdsText: z.string(),
		ingestMappingText: z.string(),
		metaText: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.scopeType === "STEP" && !data.stepNo) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stepNo"], message: "请选择步骤" });
		}
		if (data.scopeType === "SOURCE_STEP" && !data.sourceStepKey) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["sourceStepKey"],
				message: "请选择来源步骤",
			});
		}
		if (data.scopeType === "OPERATION" && !data.operationCode) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["operationCode"],
				message: "请选择工序",
			});
		}
		if (data.ingestMappingText) {
			try {
				JSON.parse(data.ingestMappingText);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["ingestMappingText"],
					message: "JSON 格式不正确",
				});
			}
		}
		if (data.metaText) {
			try {
				JSON.parse(data.metaText);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["metaText"],
					message: "JSON 格式不正确",
				});
			}
		}
	});

type StationOption = {
	id: string;
	code: string;
	name: string;
};

function RouteDetailPage() {
	const { routingCode } = useParams({ from: "/_authenticated/mes/routes/$routingCode" });
	const { data: routeDetail, isLoading, refetch } = useRouteDetail(routingCode);
	const { data: configs, isLoading: configsLoading } = useExecutionConfigs(routingCode);
	const { data: stationList } = useStations();
	const { data: stationGroups } = useStationGroups();
	const { mutateAsync: compileRoute, isPending: isCompiling } = useCompileRouteVersion();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingConfig, setEditingConfig] = useState<ExecutionConfig | null>(null);

	const steps = routeDetail?.steps ?? [];
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

	const operationOptions = useMemo(() => {
		const map = new Map<string, string>();
		steps.forEach((step) => {
			if (!map.has(step.operationCode)) {
				map.set(step.operationCode, step.operationName);
			}
		});
		return Array.from(map.entries()).map(([code, name]) => ({
			value: code,
			label: `${code} · ${name}`,
		}));
	}, [steps]);

	const stepOptions = useMemo(
		() =>
			steps.map((step) => ({
				value: String(step.stepNo),
				label: `Step ${step.stepNo} · ${step.operationName}`,
				sourceStepKey: step.sourceStepKey,
			})),
		[steps],
	);

	const sourceStepOptions = useMemo(
		() =>
			stepOptions
				.filter((step) => step.sourceStepKey)
				.map((step) => ({
					value: step.sourceStepKey as string,
					label: `${step.label} · ${step.sourceStepKey}`,
				})),
		[stepOptions],
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

	if (isLoading) {
		return <div className="text-sm text-muted-foreground">加载路由详情中...</div>;
	}

	if (!routeDetail) {
		return <div className="text-sm text-muted-foreground">未找到路由。</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">路由详情</h1>
					<p className="text-muted-foreground">查看工艺路线步骤并维护执行语义配置。</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="secondary" onClick={() => refetch()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						刷新
					</Button>
					<Can permissions={Permission.ROUTE_COMPILE}>
						<Button onClick={() => compileRoute(routingCode)} disabled={isCompiling}>
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
									const scopeLabel = config.routingStepId
										? `Step ${config.routingStep?.stepNo ?? "-"}`
										: config.sourceStepKey
											? `Source ${config.sourceStepKey}`
											: config.operationId
												? `工序 ${config.operation?.code ?? "-"}`
												: "路由";
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
										暂无配置
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
				sourceStepOptions={sourceStepOptions}
				operationOptions={operationOptions}
				stationGroupOptions={stationGroupOptions}
				stations={stationOptions}
			/>
		</div>
	);
}

function ExecutionConfigDialog({
	open,
	onOpenChange,
	editingConfig,
	routingCode,
	stepOptions,
	sourceStepOptions,
	operationOptions,
	stationGroupOptions,
	stations,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingConfig: ExecutionConfig | null;
	routingCode: string;
	stepOptions: Array<{ value: string; label: string; sourceStepKey: string | null }>;
	sourceStepOptions: Array<{ value: string; label: string }>;
	operationOptions: Array<{ value: string; label: string }>;
	stationGroupOptions: Array<{ value: string; label: string }>;
	stations: StationOption[];
}) {
	const { hasPermission } = useAbility();
	const isEdit = Boolean(editingConfig);
	const createMutation = useCreateExecutionConfig(routingCode);
	const updateMutation = useUpdateExecutionConfig(routingCode, editingConfig?.id ?? "");

	const resolvedScopeType = useMemo((): ScopeType => {
		if (editingConfig?.routingStepId) return "STEP";
		if (editingConfig?.sourceStepKey) return "SOURCE_STEP";
		if (editingConfig?.operationId) return "OPERATION";
		return "ROUTE";
	}, [editingConfig]);

	const initialStationGroupCode =
		editingConfig?.stationGroup?.code ?? (editingConfig?.stationGroupId ? "" : "");

	const form = useForm({
		defaultValues: {
			scopeType: resolvedScopeType,
			stepNo: editingConfig?.routingStep?.stepNo ? String(editingConfig.routingStep.stepNo) : "",
			sourceStepKey: editingConfig?.sourceStepKey ?? "",
			operationCode: editingConfig?.operation?.code ?? "",
			stationType: (editingConfig?.stationType as StationType) ?? "",
			stationGroupCode: initialStationGroupCode ?? "",
			allowedStationIds: normalizeStringArray(editingConfig?.allowedStationIds ?? null),
			requiresFAI: editingConfig?.requiresFAI ?? false,
			requiresAuthorization: editingConfig?.requiresAuthorization ?? false,
			dataSpecIdsText: normalizeStringArray(editingConfig?.dataSpecIds ?? null).join(","),
			ingestMappingText: editingConfig?.ingestMapping
				? JSON.stringify(editingConfig.ingestMapping, null, 2)
				: "",
			metaText: editingConfig?.meta ? JSON.stringify(editingConfig.meta, null, 2) : "",
		},
		validators: {
			onSubmit: configSchema,
		},
		onSubmit: async ({ value: values }) => {
			const dataSpecIds = parseCommaList(values.dataSpecIdsText);
			const ingestMapping = parseJson(values.ingestMappingText);
			const meta = parseJson(values.metaText);

			const stationGroupCode =
				values.stationGroupCode === "__NONE__" ? null : values.stationGroupCode || undefined;
			const stationType = values.stationType || undefined;

			if (isEdit && editingConfig) {
				await updateMutation.mutateAsync({
					stationType: stationType as "MANUAL" | "AUTO" | "BATCH" | "TEST" | undefined,
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
				sourceStepKey: values.sourceStepKey || undefined,
				operationCode: values.operationCode || undefined,
				stationType: stationType as "MANUAL" | "AUTO" | "BATCH" | "TEST" | undefined,
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
			sourceStepKey: editingConfig?.sourceStepKey ?? "",
			operationCode: editingConfig?.operation?.code ?? "",
			stationType: (editingConfig?.stationType as StationType) ?? "",
			stationGroupCode: initialStationGroupCode ?? "",
			allowedStationIds: normalizeStringArray(editingConfig?.allowedStationIds ?? null),
			requiresFAI: editingConfig?.requiresFAI ?? false,
			requiresAuthorization: editingConfig?.requiresAuthorization ?? false,
			dataSpecIdsText: normalizeStringArray(editingConfig?.dataSpecIds ?? null).join(","),
			ingestMappingText: editingConfig?.ingestMapping
				? JSON.stringify(editingConfig.ingestMapping, null, 2)
				: "",
			metaText: editingConfig?.meta ? JSON.stringify(editingConfig.meta, null, 2) : "",
		});
	}, [editingConfig, form, resolvedScopeType, initialStationGroupCode]);

	useEffect(() => {
		if (open && !editingConfig) {
			form.reset({
				scopeType: "ROUTE",
				stepNo: "",
				sourceStepKey: "",
				operationCode: "",
				stationType: "",
				stationGroupCode: "",
				allowedStationIds: [],
				requiresFAI: false,
				requiresAuthorization: false,
				dataSpecIdsText: "",
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
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑执行配置" : "新增执行配置"}</DialogTitle>
					<DialogDescription>定义站点类型、站点组以及采集项等规则。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
							<form.Field
								name="scopeType"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>配置范围</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={(v) => field.handleChange(v as ScopeType)}
												disabled={isEdit}
											>
												<SelectTrigger id={field.name} aria-invalid={isInvalid}>
													<SelectValue placeholder="选择范围" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="ROUTE">整条路由</SelectItem>
													<SelectItem value="OPERATION">工序</SelectItem>
													<SelectItem value="STEP">步骤</SelectItem>
													<SelectItem value="SOURCE_STEP">来源步骤</SelectItem>
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>

							<form.Field
								name="scopeType"
								children={(scopeField) => (
									<>
										{scopeField.state.value === "STEP" && (
											<form.Field
												name="stepNo"
												children={(field) => {
													const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel htmlFor={field.name}>步骤</FieldLabel>
															<Select
																value={field.state.value || ""}
																onValueChange={field.handleChange}
															>
																<SelectTrigger id={field.name} aria-invalid={isInvalid}>
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
															{isInvalid && <FieldError errors={field.state.meta.errors} />}
														</Field>
													);
												}}
											/>
										)}

										{scopeField.state.value === "SOURCE_STEP" && (
											<form.Field
												name="sourceStepKey"
												children={(field) => {
													const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel htmlFor={field.name}>来源步骤</FieldLabel>
															<Select
																value={field.state.value || ""}
																onValueChange={field.handleChange}
															>
																<SelectTrigger id={field.name} aria-invalid={isInvalid}>
																	<SelectValue placeholder="选择来源步骤" />
																</SelectTrigger>
																<SelectContent>
																	{sourceStepOptions.map((option) => (
																		<SelectItem key={option.value} value={option.value}>
																			{option.label}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															{isInvalid && <FieldError errors={field.state.meta.errors} />}
														</Field>
													);
												}}
											/>
										)}

										{scopeField.state.value === "OPERATION" && (
											<form.Field
												name="operationCode"
												children={(field) => {
													const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel htmlFor={field.name}>工序</FieldLabel>
															<Select
																value={field.state.value || ""}
																onValueChange={field.handleChange}
															>
																<SelectTrigger id={field.name} aria-invalid={isInvalid}>
																	<SelectValue placeholder="选择工序" />
																</SelectTrigger>
																<SelectContent>
																	{operationOptions.map((option) => (
																		<SelectItem key={option.value} value={option.value}>
																			{option.label}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															{isInvalid && <FieldError errors={field.state.meta.errors} />}
														</Field>
													);
												}}
											/>
										)}
									</>
								)}
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<form.Field
								name="stationType"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>站点类型</FieldLabel>
											<Select
												value={field.state.value || ""}
												onValueChange={(v) => field.handleChange(v as StationType)}
											>
												<SelectTrigger id={field.name} aria-invalid={isInvalid}>
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
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>

							<form.Field
								name="stationGroupCode"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>站点组</FieldLabel>
											<Combobox
												options={[
													{ value: "__NONE__", label: "不指定站点组" },
													...stationGroupOptions,
												]}
												value={field.state.value || ""}
												onValueChange={field.handleChange}
												placeholder="选择站点组"
												searchPlaceholder="搜索站点组"
												emptyText="未找到站点组"
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>
						</div>

						<form.Field
							name="allowedStationIds"
							children={(field) => {
								const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel>允许站点</FieldLabel>
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
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						/>

						<div className="grid gap-4 md:grid-cols-2">
							<form.Field
								name="requiresFAI"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>需要首件</FieldLabel>
											<Select
												value={field.state.value ? "true" : "false"}
												onValueChange={(value) => field.handleChange(value === "true")}
											>
												<SelectTrigger id={field.name} aria-invalid={isInvalid}>
													<SelectValue placeholder="选择" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="false">否</SelectItem>
													<SelectItem value="true">是</SelectItem>
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>

							<form.Field
								name="requiresAuthorization"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>需要授权</FieldLabel>
											<Select
												value={field.state.value ? "true" : "false"}
												onValueChange={(value) => field.handleChange(value === "true")}
											>
												<SelectTrigger id={field.name} aria-invalid={isInvalid}>
													<SelectValue placeholder="选择" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="false">否</SelectItem>
													<SelectItem value="true">是</SelectItem>
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>
						</div>

						<form.Field
							name="dataSpecIdsText"
							children={(field) => {
								const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>采集项标识</FieldLabel>
										<Input
											id={field.name}
											placeholder="多个用逗号分隔，例如 TEMP,POWER"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
										/>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						/>

						<div className="grid gap-4 md:grid-cols-2">
							<form.Field
								name="ingestMappingText"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>采集映射 (JSON)</FieldLabel>
											<Textarea
												id={field.name}
												placeholder='例如 {"serial":"SN","result":"PASS"}'
												rows={6}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>

							<form.Field
								name="metaText"
								children={(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>扩展信息 (JSON)</FieldLabel>
											<Textarea
												id={field.name}
												placeholder='例如 {"note":"..."}'
												rows={6}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							/>
						</div>
					</FieldGroup>

					<DialogFooter>
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

function parseCommaList(value?: string) {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseJson(value?: string) {
	if (!value) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}
