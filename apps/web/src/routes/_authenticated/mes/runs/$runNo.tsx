import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ClipboardCheck,
	Loader2,
	Package,
	Plus,
	RefreshCw,
	Shield,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Can } from "@/components/ability/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCreateFai, useFaiByRun, useFaiGate } from "@/hooks/use-fai";
import { useMrbDecision, useOqcByRun } from "@/hooks/use-oqc";
import {
	type ReadinessCheckItem,
	usePerformFormalCheck,
	usePerformPrecheck,
	useReadinessLatest,
	useWaiveItem,
} from "@/hooks/use-readiness";
import { useCloseRun, useGenerateUnits, useRunDetail } from "@/hooks/use-runs";
import { INSPECTION_STATUS_MAP, READINESS_ITEM_TYPE_MAP } from "@/lib/constants";
import { CloseoutDialog } from "@/routes/_authenticated/mes/-components/closeout-dialog";
import {
	MrbDecisionDialog,
	type MrbDecisionFormValues,
} from "@/routes/_authenticated/mes/-components/mrb-decision-dialog";

export const Route = createFileRoute("/_authenticated/mes/runs/$runNo")({
	component: RunDetailPage,
});

function RunDetailPage() {
	const { runNo } = Route.useParams();
	const { data, isLoading, refetch, isFetching } = useRunDetail(runNo);
	const closeRun = useCloseRun();
	const generateUnits = useGenerateUnits();
	const {
		data: readinessData,
		isLoading: readinessLoading,
		refetch: refetchReadiness,
	} = useReadinessLatest(runNo);

	// FAI hooks
	const { data: faiGate, isLoading: faiGateLoading } = useFaiGate(runNo);
	const { data: existingFai, isLoading: faiLoading, refetch: refetchFai } = useFaiByRun(runNo);
	const createFai = useCreateFai();

	// OQC & MRB hooks
	const { data: oqcDetail, isLoading: oqcLoading } = useOqcByRun(runNo);
	const mrbDecision = useMrbDecision();

	const performPrecheck = usePerformPrecheck();
	const performFormalCheck = usePerformFormalCheck();
	const waiveItem = useWaiveItem();

	const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ReadinessCheckItem | null>(null);
	const [waiveReason, setWaiveReason] = useState("");

	// FAI creation dialog state
	const [faiDialogOpen, setFaiDialogOpen] = useState(false);
	const [faiSampleQty, setFaiSampleQty] = useState(1);

	// MRB dialog state
	const [mrbDialogOpen, setMrbDialogOpen] = useState(false);
	const [closeoutDialogOpen, setCloseoutDialogOpen] = useState(false);

	// Generate units dialog state
	const [generateUnitsDialogOpen, setGenerateUnitsDialogOpen] = useState(false);
	const [generateUnitsQty, setGenerateUnitsQty] = useState(10);

	const formatTime = (value?: string | Date | null) => {
		if (!value) return "-";
		const date = typeof value === "string" ? new Date(value) : value;
		return format(date, "yyyy-MM-dd HH:mm:ss");
	};

	const getStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			PREP: { label: "准备中", variant: "outline" },
			AUTHORIZED: { label: "已授权", variant: "default" },
			IN_PROGRESS: { label: "生产中", variant: "default" },
			ON_HOLD: { label: "隔离", variant: "outline" },
			COMPLETED: { label: "已完成", variant: "secondary" },
			CLOSED_REWORK: { label: "闭环返修", variant: "secondary" },
			SCRAPPED: { label: "报废", variant: "destructive" },
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
			OUT_FAILED: { label: "不良", variant: "destructive" },
			SCRAPPED: { label: "报废", variant: "destructive" },
			ON_HOLD: { label: "隔离", variant: "outline" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getReadinessStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			PASSED: { label: "已通过", variant: "default" },
			FAILED: { label: "未通过", variant: "destructive" },
			PENDING: { label: "检查中", variant: "outline" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getItemStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			PASSED: { label: "通过", variant: "default" },
			FAILED: { label: "失败", variant: "destructive" },
			WAIVED: { label: "已豁免", variant: "secondary" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getItemTypeLabel = (type: string) => {
		return READINESS_ITEM_TYPE_MAP[type] ?? type;
	};

	const getFaiStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			PENDING: { label: "待开始", variant: "outline" },
			INSPECTING: { label: "检验中", variant: "default" },
			PASS: { label: "已通过", variant: "secondary" },
			FAIL: { label: "未通过", variant: "destructive" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getOqcStatusBadge = (status: string) => {
		const label = INSPECTION_STATUS_MAP[status] ?? status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "INSPECTING") variant = "default";
		if (status === "PASS") variant = "secondary";
		if (status === "FAIL") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const handleWaive = (item: ReadinessCheckItem) => {
		setSelectedItem(item);
		setWaiveReason("");
		setWaiveDialogOpen(true);
	};

	const confirmWaive = async () => {
		if (!selectedItem || !waiveReason.trim()) return;

		await waiveItem.mutateAsync({
			runNo,
			itemId: selectedItem.id,
			reason: waiveReason.trim(),
		});

		setWaiveDialogOpen(false);
		setSelectedItem(null);
		setWaiveReason("");
		refetchReadiness();
	};

	const handleRunCheck = async (type: "precheck" | "formal") => {
		if (type === "precheck") {
			await performPrecheck.mutateAsync(runNo);
		} else {
			await performFormalCheck.mutateAsync(runNo);
		}
		refetchReadiness();
	};

	const handleCreateFai = async () => {
		if (faiSampleQty < 1) return;
		await createFai.mutateAsync({ runNo, sampleQty: faiSampleQty });
		setFaiDialogOpen(false);
		setFaiSampleQty(1);
		refetchFai();
	};

	const handleMrbDecision = async (values: MrbDecisionFormValues) => {
		await mrbDecision.mutateAsync({ runNo, data: values });
	};

	const handleCloseoutConfirm = async () => {
		try {
			await closeRun.mutateAsync({ runNo });
			setCloseoutDialogOpen(false);
			refetch();
		} catch {
			// Toast handled in mutation onError
		}
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

	const canShowReadinessActions = data.run.status === "PREP";

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
				<div className="flex items-center gap-2">
					{data.run.status === "IN_PROGRESS" && (
						<Can permissions={Permission.RUN_CLOSE}>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCloseoutDialogOpen(true)}
								disabled={closeRun.isPending}
							>
								<ClipboardCheck className="mr-2 h-4 w-4" />
								收尾
							</Button>
						</Can>
					)}
					<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
						<RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
						刷新
					</Button>
				</div>
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
						{data.unitStats.total === 0 &&
						(data.run.status === "PREP" || data.run.status === "AUTHORIZED") ? (
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => setGenerateUnitsDialogOpen(true)}
							>
								<Plus className="mr-1 h-3 w-3" />
								生成单件
							</Button>
						) : (
							<p className="text-xs text-muted-foreground">完成率: {progressPercent}%</p>
						)}
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

				<Card className="lg:col-span-2">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								{readinessLoading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : !readinessData ? (
									<AlertTriangle className="h-5 w-5 text-yellow-600" />
								) : readinessData.status === "PASSED" ? (
									<CheckCircle2 className="h-5 w-5 text-green-600" />
								) : (
									<XCircle className="h-5 w-5 text-red-600" />
								)}
								准备状态
							</CardTitle>
							{canShowReadinessActions && (
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleRunCheck("precheck")}
										disabled={performPrecheck.isPending}
									>
										{performPrecheck.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										执行预检
									</Button>
									<Button
										variant="default"
										size="sm"
										onClick={() => handleRunCheck("formal")}
										disabled={performFormalCheck.isPending}
									>
										{performFormalCheck.isPending && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										正式检查
									</Button>
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{readinessLoading ? (
							<p className="text-muted-foreground">加载中...</p>
						) : !readinessData ? (
							<div className="py-4 text-center text-muted-foreground">
								<p>暂无检查记录</p>
								{canShowReadinessActions && (
									<p className="text-sm mt-1">点击上方按钮执行准备检查</p>
								)}
							</div>
						) : (
							<div className="space-y-4">
								<div className="grid gap-4 md:grid-cols-4">
									<div>
										<p className="text-sm text-muted-foreground">检查类型</p>
										<p className="font-medium">
											{readinessData.type === "FORMAL" ? "正式检查" : "预检"}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">检查状态</p>
										{getReadinessStatusBadge(readinessData.status)}
									</div>
									<div>
										<p className="text-sm text-muted-foreground">检查时间</p>
										<p className="font-medium">{formatTime(readinessData.checkedAt)}</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">结果汇总</p>
										<p className="font-medium text-sm">
											通过: {readinessData.summary.passed} · 失败: {readinessData.summary.failed} ·
											豁免: {readinessData.summary.waived}
										</p>
									</div>
								</div>

								{readinessData.items.length > 0 && (
									<div className="border rounded-lg">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>类型</TableHead>
													<TableHead>标识</TableHead>
													<TableHead>状态</TableHead>
													<TableHead>原因</TableHead>
													<TableHead>操作</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{readinessData.items.map((item) => (
													<TableRow key={item.id}>
														<TableCell>{getItemTypeLabel(item.itemType)}</TableCell>
														<TableCell className="font-mono text-sm">{item.itemKey}</TableCell>
														<TableCell>{getItemStatusBadge(item.status)}</TableCell>
														<TableCell className="max-w-xs truncate text-sm text-muted-foreground">
															{item.failReason ??
																(item.waiveReason ? `豁免: ${item.waiveReason}` : "-")}
														</TableCell>
														<TableCell>
															{item.status === "FAILED" && canShowReadinessActions && (
																<Button variant="ghost" size="sm" onClick={() => handleWaive(item)}>
																	<Shield className="mr-1 h-3 w-3" />
																	豁免
																</Button>
															)}
															{item.status === "WAIVED" && item.waivedAt && (
																<span className="text-xs text-muted-foreground">
																	{formatTime(item.waivedAt)}
																</span>
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* FAI Card - only show if FAI is required or exists */}
			{(faiGate?.requiresFai || existingFai) && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								{faiLoading || faiGateLoading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : existingFai?.status === "PASS" ? (
									<CheckCircle2 className="h-5 w-5 text-green-600" />
								) : existingFai?.status === "FAIL" ? (
									<XCircle className="h-5 w-5 text-red-600" />
								) : existingFai ? (
									<ClipboardCheck className="h-5 w-5 text-blue-600" />
								) : (
									<AlertTriangle className="h-5 w-5 text-yellow-600" />
								)}
								首件检验 (FAI)
							</CardTitle>
							{canShowReadinessActions && !existingFai && (
								<Button variant="default" size="sm" onClick={() => setFaiDialogOpen(true)}>
									<Plus className="mr-2 h-4 w-4" />
									创建 FAI
								</Button>
							)}
							{existingFai && (
								<Button variant="outline" size="sm" asChild>
									<Link to="/mes/fai">
										<ClipboardCheck className="mr-2 h-4 w-4" />
										查看详情
									</Link>
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{faiLoading || faiGateLoading ? (
							<p className="text-muted-foreground">加载中...</p>
						) : existingFai ? (
							<div className="grid gap-4 md:grid-cols-4">
								<div>
									<p className="text-sm text-muted-foreground">状态</p>
									{getFaiStatusBadge(existingFai.status)}
								</div>
								<div>
									<p className="text-sm text-muted-foreground">抽样数量</p>
									<p className="font-medium">{existingFai.sampleQty ?? "-"}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">通过/失败</p>
									<p className="font-medium">
										{existingFai.passedQty ?? 0} / {existingFai.failedQty ?? 0}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">创建时间</p>
									<p className="font-medium">{formatTime(existingFai.createdAt)}</p>
								</div>
							</div>
						) : (
							<div className="py-4 text-center text-muted-foreground">
								<p>此批次需要首件检验</p>
								{canShowReadinessActions && (
									<p className="text-sm mt-1">点击上方按钮创建 FAI 任务</p>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{(oqcDetail || oqcLoading) && (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<CardTitle className="flex items-center gap-2">
								{oqcLoading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : oqcDetail?.status === "PASS" ? (
									<CheckCircle2 className="h-5 w-5 text-green-600" />
								) : oqcDetail?.status === "FAIL" ? (
									<XCircle className="h-5 w-5 text-red-600" />
								) : oqcDetail ? (
									<ClipboardCheck className="h-5 w-5 text-blue-600" />
								) : (
									<AlertTriangle className="h-5 w-5 text-yellow-600" />
								)}
								出货检验 (OQC)
							</CardTitle>
							<div className="flex flex-wrap items-center gap-2">
								{oqcDetail && getOqcStatusBadge(oqcDetail.status)}
								<Button variant="outline" size="sm" asChild>
									<Link to="/mes/oqc">查看列表</Link>
								</Button>
								{data.run.status === "ON_HOLD" && oqcDetail?.status === "FAIL" && (
									<Can permissions={Permission.QUALITY_DISPOSITION}>
										<Button
											size="sm"
											onClick={() => setMrbDialogOpen(true)}
											disabled={mrbDecision.isPending}
										>
											MRB 决策
										</Button>
									</Can>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{oqcLoading ? (
							<p className="text-muted-foreground">加载中...</p>
						) : oqcDetail ? (
							<div className="grid gap-4 md:grid-cols-4">
								<div>
									<p className="text-sm text-muted-foreground">状态</p>
									{getOqcStatusBadge(oqcDetail.status)}
								</div>
								<div>
									<p className="text-sm text-muted-foreground">抽样数量</p>
									<p className="font-medium">{oqcDetail.sampleQty ?? "-"}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">通过/失败</p>
									<p className="font-medium">
										{oqcDetail.passedQty ?? 0} / {oqcDetail.failedQty ?? 0}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">创建时间</p>
									<p className="font-medium">{formatTime(oqcDetail.createdAt)}</p>
								</div>
							</div>
						) : (
							<div className="py-4 text-center text-muted-foreground">暂无 OQC 记录</div>
						)}
					</CardContent>
				</Card>
			)}

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

			<Dialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>豁免检查项</DialogTitle>
						<DialogDescription>
							豁免 {selectedItem && getItemTypeLabel(selectedItem.itemType)} 检查项:{" "}
							{selectedItem?.itemKey}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						{selectedItem?.failReason && (
							<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
								<p className="font-medium">失败原因:</p>
								<p>{selectedItem.failReason}</p>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="waiveReason">豁免原因 (必填)</Label>
							<Input
								id="waiveReason"
								value={waiveReason}
								onChange={(e) => setWaiveReason(e.target.value)}
								placeholder="请输入豁免原因..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setWaiveDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={confirmWaive} disabled={!waiveReason.trim() || waiveItem.isPending}>
							{waiveItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							确认豁免
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* FAI Creation Dialog */}
			<Dialog open={faiDialogOpen} onOpenChange={setFaiDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>创建首件检验 (FAI)</DialogTitle>
						<DialogDescription>为批次 {runNo} 创建首件检验任务</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="faiSampleQty">抽样数量</Label>
							<Input
								id="faiSampleQty"
								type="number"
								min={1}
								value={faiSampleQty}
								onChange={(e) => setFaiSampleQty(Number.parseInt(e.target.value, 10) || 1)}
								placeholder="输入抽样数量"
							/>
							<p className="text-xs text-muted-foreground">首件检验将抽取指定数量的样品进行检验</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFaiDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleCreateFai} disabled={faiSampleQty < 1 || createFai.isPending}>
							{createFai.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							创建
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Generate Units Dialog */}
			<Dialog open={generateUnitsDialogOpen} onOpenChange={setGenerateUnitsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>生成单件</DialogTitle>
						<DialogDescription>为批次 {runNo} 生成单件序列号</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="generateUnitsQty">生成数量</Label>
							<Input
								id="generateUnitsQty"
								type="number"
								min={1}
								max={10000}
								value={generateUnitsQty}
								onChange={(e) => setGenerateUnitsQty(Number.parseInt(e.target.value, 10) || 1)}
								placeholder="输入生成数量"
							/>
							<p className="text-xs text-muted-foreground">
								将生成 {generateUnitsQty} 个单件，SN 格式: SN-{runNo}-0001 ~ SN-{runNo}-
								{String(generateUnitsQty).padStart(4, "0")}
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setGenerateUnitsDialogOpen(false)}>
							取消
						</Button>
						<Button
							onClick={async () => {
								await generateUnits.mutateAsync({ runNo, quantity: generateUnitsQty });
								setGenerateUnitsDialogOpen(false);
								refetch();
							}}
							disabled={generateUnitsQty < 1 || generateUnits.isPending}
						>
							{generateUnits.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							生成
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<MrbDecisionDialog
				open={mrbDialogOpen}
				onOpenChange={setMrbDialogOpen}
				runNo={runNo}
				onSubmit={handleMrbDecision}
				isSubmitting={mrbDecision.isPending}
			/>

			<CloseoutDialog
				open={closeoutDialogOpen}
				onOpenChange={setCloseoutDialogOpen}
				title="批次收尾确认"
				description={`确认对批次 ${runNo} 执行收尾关闭吗？`}
				confirmText="确认收尾"
				isSubmitting={closeRun.isPending}
				onConfirm={handleCloseoutConfirm}
			/>
		</div>
	);
}
