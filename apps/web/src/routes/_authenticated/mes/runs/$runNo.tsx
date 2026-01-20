import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ClipboardCheck,
	Loader2,
	Package,
	Play,
	Plus,
	RefreshCw,
	Shield,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { useAbility } from "@/hooks/use-ability";
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
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCreateFai, useFaiByRun, useFaiGate, useStartFai } from "@/hooks/use-fai";
import { useMrbDecision, useOqcByRun } from "@/hooks/use-oqc";
import {
	type ReadinessCheckItem,
	usePerformFormalCheck,
	usePerformPrecheck,
	useReadinessLatest,
	useWaiveItem,
} from "@/hooks/use-readiness";
import {
	useAuthorizeRun,
	useCloseRun,
	useGenerateUnits,
	useRunDetail,
	useRunUnits,
} from "@/hooks/use-runs";
import { ApiError } from "@/lib/api-error";
import {
	FAI_STATUS_MAP,
	INSPECTION_STATUS_MAP,
	READINESS_ITEM_STATUS_MAP,
	READINESS_ITEM_TYPE_MAP,
	READINESS_STATUS_MAP,
	RUN_STATUS_MAP,
	UNIT_STATUS_MAP,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
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
	const navigate = useNavigate();
	const { hasPermission } = useAbility();
	const { data, isLoading, refetch, isFetching } = useRunDetail(runNo);
	const authorizeRun = useAuthorizeRun();
	const closeRun = useCloseRun();
	const generateUnits = useGenerateUnits();
	const [unitsPage, setUnitsPage] = useState(1);
	const unitsPageSize = 50;
	const {
		data: runUnits,
		isLoading: runUnitsLoading,
		isFetching: runUnitsFetching,
	} = useRunUnits({ runNo, page: unitsPage, pageSize: unitsPageSize });
	const {
		data: readinessData,
		isLoading: readinessLoading,
		refetch: refetchReadiness,
	} = useReadinessLatest(runNo);

	// FAI hooks
	const { data: faiGate, isLoading: faiGateLoading } = useFaiGate(runNo);
	const { data: existingFai, isLoading: faiLoading, refetch: refetchFai } = useFaiByRun(runNo);
	const createFai = useCreateFai();
	const startFai = useStartFai();

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
	const [pendingTrialLaunch, setPendingTrialLaunch] = useState(false);
	const [pendingCreateFai, setPendingCreateFai] = useState<{
		sampleQty: number;
		launchTrial: boolean;
	} | null>(null);
	const [pendingTrialNavigate, setPendingTrialNavigate] = useState(false);

	// MRB dialog state
	const [mrbDialogOpen, setMrbDialogOpen] = useState(false);
	const [closeoutDialogOpen, setCloseoutDialogOpen] = useState(false);

	// Generate units dialog state
	const [generateUnitsDialogOpen, setGenerateUnitsDialogOpen] = useState(false);
	const [generateUnitsQty, setGenerateUnitsQty] = useState(10);

	useEffect(() => {
		if (!data?.run.planQty) return;
		setGenerateUnitsQty((current) => Math.min(current, data.run.planQty));
	}, [data?.run.planQty]);

	useEffect(() => {
		if (!runNo) return;
		setUnitsPage(1);
	}, [runNo]);
	const getStatusBadge = (status: string) => {
		const label = RUN_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "AUTHORIZED" || status === "IN_PROGRESS") variant = "default";
		if (status === "COMPLETED" || status === "CLOSED_REWORK") variant = "secondary";
		if (status === "SCRAPPED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getUnitStatusBadge = (status: string) => {
		const label = UNIT_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "IN_STATION") variant = "default";
		if (status === "DONE") variant = "secondary";
		if (status === "OUT_FAILED" || status === "SCRAPPED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getReadinessStatusBadge = (status: string) => {
		const label = READINESS_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "PASSED") variant = "default";
		if (status === "FAILED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getItemStatusBadge = (status: string) => {
		const label = READINESS_ITEM_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "PASSED") variant = "default";
		if (status === "FAILED") variant = "destructive";
		if (status === "WAIVED") variant = "secondary";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getItemTypeLabel = (type: string) => {
		return READINESS_ITEM_TYPE_MAP[type] ?? type;
	};

	const getFaiStatusBadge = (status: string) => {
		const label = FAI_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "INSPECTING") variant = "default";
		if (status === "PASS") variant = "secondary";
		if (status === "FAIL") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getOqcStatusBadge = (status: string) => {
		const label = INSPECTION_STATUS_MAP[status] ?? status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "INSPECTING") variant = "default";
		if (status === "PASS") variant = "secondary";
		if (status === "FAIL") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const formatStepLabel = (
		step:
			| { stepNo: number; operationCode: string; operationName: string | null }
			| null
			| undefined,
	) => {
		if (!step) return "-";
		const operationLabel = step.operationName ?? step.operationCode;
		return `Step ${step.stepNo} ${operationLabel}`;
	};

	const formatStepStation = (
		step:
			| {
					stationCodes: string[];
					stationGroup: { code: string; name: string } | null;
			  }
			| null
			| undefined,
	) => {
		if (!step) return "-";
		if (step.stationCodes.length > 0) return step.stationCodes.join(", ");
		return step.stationGroup?.code ?? "-";
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

	const navigateToExecution = () => {
		if (!data) return;
		navigate({
			to: "/mes/execution",
			search: { runNo: data.run.runNo, woNo: data.workOrder.woNo },
		});
	};

	const openGenerateUnitsDialog = (quantity: number) => {
		if (!data) return;
		setGenerateUnitsQty(Math.min(quantity, data.run.planQty));
		setGenerateUnitsDialogOpen(true);
	};

	const createAndStartFai = async (sampleQty: number, launchTrial: boolean) => {
		if (!data) return;
		let created: { id: string; sampleQty?: number } | null = null;

		try {
			created = (await createFai.mutateAsync({ runNo, sampleQty })) as {
				id: string;
				sampleQty?: number;
			};
		} catch {
			return;
		}

		setFaiDialogOpen(false);
		setFaiSampleQty(1);

		try {
			await startFai.mutateAsync(created.id);
			refetchFai();
		} catch (error: unknown) {
			if (error instanceof ApiError) {
				toast.error("开始 FAI 检验失败", {
					description: error.message
						? `${error.message}${error.code ? `（${error.code}）` : ""}`
						: error.code,
				});
				return;
			}
			toast.error("开始 FAI 检验失败", { description: "请重试或联系管理员" });
			return;
		}

		if (launchTrial) {
			const requiredQty =
				created.sampleQty && created.sampleQty > 0 ? created.sampleQty : sampleQty;
			const missing = Math.max(requiredQty - (data.unitStats.total ?? 0), 0);
			if (missing > 0) {
				setPendingTrialNavigate(true);
				openGenerateUnitsDialog(missing);
				return;
			}
			navigateToExecution();
		}
	};

	const handleCreateFai = async () => {
		if (!data || faiSampleQty < 1) return;
		const launchTrial = pendingTrialLaunch;
		setPendingTrialLaunch(false);

		const missing = Math.max(faiSampleQty - (data.unitStats.total ?? 0), 0);
		if (missing > 0) {
			setPendingCreateFai({ sampleQty: faiSampleQty, launchTrial });
			openGenerateUnitsDialog(missing);
			setFaiDialogOpen(false);
			return;
		}

		await createAndStartFai(faiSampleQty, launchTrial);
	};

	const handleTrialExecution = () => {
		if (!data) return;
		if (!existingFai) {
			setPendingTrialLaunch(true);
			setFaiDialogOpen(true);
			return;
		}
		if (existingFai.status !== "INSPECTING") {
			if (existingFai.status === "PASS") {
				toast.info("FAI 已通过，请先授权批次");
				return;
			}
			if (existingFai.status === "FAIL") {
				toast.error("FAI 未通过，无法进入试产执行");
				return;
			}
			toast.info("FAI 尚未开始");
			return;
		}

		const requiredQty =
			existingFai.sampleQty && existingFai.sampleQty > 0 ? existingFai.sampleQty : 1;
		const missing = Math.max(requiredQty - (data.unitStats.total ?? 0), 0);
		if (missing > 0) {
			setPendingTrialNavigate(true);
			openGenerateUnitsDialog(missing);
			return;
		}

		navigateToExecution();
	};

	const handleGenerateUnitsConfirm = async () => {
		if (!data) return;
		await generateUnits.mutateAsync({ runNo, quantity: generateUnitsQty });
		setGenerateUnitsDialogOpen(false);
		refetch();

		if (pendingCreateFai) {
			const { sampleQty, launchTrial } = pendingCreateFai;
			setPendingCreateFai(null);
			await createAndStartFai(sampleQty, launchTrial);
			return;
		}

		if (pendingTrialNavigate) {
			setPendingTrialNavigate(false);
			navigateToExecution();
		}
	};

	const handleFaiDialogOpenChange = (open: boolean) => {
		setFaiDialogOpen(open);
		if (!open) {
			setPendingTrialLaunch(false);
		}
	};

	const handleGenerateUnitsDialogChange = (open: boolean) => {
		setGenerateUnitsDialogOpen(open);
		if (!open) {
			setPendingCreateFai(null);
			setPendingTrialNavigate(false);
		}
	};

	const handleMrbDecision = async (values: MrbDecisionFormValues) => {
		await mrbDecision.mutateAsync({ runNo, data: values });
	};

	const handleAuthorize = async (action: "AUTHORIZE" | "REVOKE") => {
		try {
			await authorizeRun.mutateAsync({ runNo, action });
			refetch();
		} catch {
			// Toast handled in mutation onError
		}
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

	const isInPrepStatus = data.run.status === "PREP";
	const canCheckReadiness = hasPermission(Permission.READINESS_CHECK);
	const canShowReadinessActions = isInPrepStatus && canCheckReadiness;
	const readinessStatus = readinessData?.status ?? "PENDING";
	const readinessStageLabel = readinessLoading
		? "加载中"
		: readinessStatus === "PASSED"
			? "已完成"
			: readinessStatus === "FAILED"
				? "未通过"
				: "待开始";
	const readinessStageVariant =
		readinessStatus === "PASSED"
			? "secondary"
			: readinessStatus === "FAILED"
				? "destructive"
				: "outline";
	const requiresFai = faiGate?.requiresFai ?? false;
	const faiStage = (() => {
		if (faiGateLoading || faiLoading) {
			return { label: "加载中", variant: "outline" as const };
		}
		if (!requiresFai && !existingFai) {
			return { label: "不需要", variant: "outline" as const };
		}
		if (!existingFai) {
			return { label: "待开始", variant: "outline" as const };
		}
		if (existingFai.status === "INSPECTING") {
			return { label: "进行中", variant: "default" as const };
		}
		if (existingFai.status === "PASS") {
			return { label: "已完成", variant: "secondary" as const };
		}
		if (existingFai.status === "FAIL") {
			return { label: "失败", variant: "destructive" as const };
		}
		return { label: "待开始", variant: "outline" as const };
	})();
	const authorizedStage = ["AUTHORIZED", "IN_PROGRESS", "COMPLETED", "CLOSED_REWORK"].includes(
		data.run.status,
	);
	const executionStage = ["IN_PROGRESS", "COMPLETED", "CLOSED_REWORK"].includes(data.run.status);
	const closeoutStage = ["COMPLETED", "CLOSED_REWORK"].includes(data.run.status);
	const nextAction = (() => {
		if (readinessStatus === "FAILED") return "处理就绪检查失败项";
		if (readinessStatus !== "PASSED") return "完成就绪检查";
		if (requiresFai || existingFai) {
			if (!existingFai) return "创建并开始 FAI";
			if (existingFai.status === "INSPECTING") return "完成试产并记录检验";
			if (existingFai.status === "FAIL") return "复核 FAI 失败原因";
			if (existingFai.status !== "PASS") return "完成 FAI";
		}
		if (data.run.status === "PREP") return "授权生产";
		if (data.run.status === "AUTHORIZED") return "开始执行";
		if (data.run.status === "IN_PROGRESS") return "收尾";
		return null;
	})();
	const trialCta =
		data.run.status === "PREP"
			? (() => {
					if (faiGateLoading || faiLoading) {
						return { label: "试产执行", disabled: true };
					}
					if (!requiresFai && !existingFai) {
						return { label: "等待授权", disabled: true };
					}
					if (!existingFai) {
						return {
							label: "创建并开始试产",
							disabled: false,
							onClick: () => {
								setPendingTrialLaunch(true);
								setFaiDialogOpen(true);
							},
						};
					}
					if (existingFai.status === "INSPECTING") {
						return { label: "试产执行", disabled: false, onClick: handleTrialExecution };
					}
					if (existingFai.status === "FAIL") {
						return { label: "FAI 未通过", disabled: true };
					}
					return { label: "等待授权", disabled: true };
				})()
			: null;

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
					{data.run.status === "PREP" && (
						<Can permissions={Permission.RUN_AUTHORIZE}>
							<Button
								size="sm"
								onClick={() => handleAuthorize("AUTHORIZE")}
								disabled={authorizeRun.isPending}
							>
								<CheckCircle2 className="mr-2 h-4 w-4" />
								授权生产
							</Button>
						</Can>
					)}
					{data.run.status === "AUTHORIZED" && (
						<Can permissions={Permission.RUN_AUTHORIZE}>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleAuthorize("REVOKE")}
								disabled={authorizeRun.isPending}
							>
								<XCircle className="mr-2 h-4 w-4" />
								撤销授权
							</Button>
						</Can>
					)}
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
					{trialCta && (
						<Can permissions={Permission.EXEC_TRACK_IN}>
							<Button
								variant="default"
								size="sm"
								onClick={trialCta.onClick}
								disabled={trialCta.disabled}
							>
								<Play className="mr-2 h-4 w-4" />
								{trialCta.label}
							</Button>
						</Can>
					)}
					{(data.run.status === "AUTHORIZED" || data.run.status === "IN_PROGRESS") && (
						<Can permissions={Permission.EXEC_TRACK_IN}>
							<Button variant="default" size="sm" asChild>
								<Link
									to="/mes/execution"
									search={{ runNo: data.run.runNo, woNo: data.workOrder.woNo }}
								>
									<Play className="mr-2 h-4 w-4" />
									开始执行
								</Link>
							</Button>
						</Can>
					)}
					<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
						<RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
						刷新
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle>流程进度</CardTitle>
					<CardDescription>就绪检查 → 首件检验 → 授权生产 → 批次执行 → 收尾</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-5">
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">就绪检查</p>
							<Badge variant={readinessStageVariant}>{readinessStageLabel}</Badge>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">首件检验</p>
							<Badge variant={faiStage.variant}>{faiStage.label}</Badge>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">授权生产</p>
							<Badge variant={authorizedStage ? "secondary" : "outline"}>
								{authorizedStage ? "已完成" : "待开始"}
							</Badge>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">批次执行</p>
							<Badge
								variant={
									executionStage
										? data.run.status === "IN_PROGRESS"
											? "default"
											: "secondary"
										: "outline"
								}
							>
								{executionStage
									? data.run.status === "IN_PROGRESS"
										? "进行中"
										: "已完成"
									: "待开始"}
							</Badge>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">收尾</p>
							<Badge variant={closeoutStage ? "secondary" : "outline"}>
								{closeoutStage ? "已完成" : "待开始"}
							</Badge>
						</div>
					</div>
					{nextAction && (
						<div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
							<span className="text-muted-foreground">下一步</span>
							<span className="font-medium">{nextAction}</span>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>批次计划数量</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{data.run.planQty}</p>
						<p className="text-xs text-muted-foreground">工单: {data.workOrder.plannedQty}</p>
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
						<p className="text-2xl font-bold text-primary">
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
							<p className="font-medium">{formatDateTime(data.run.startedAt)}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">结束时间</p>
							<p className="font-medium">{formatDateTime(data.run.endedAt)}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">创建时间</p>
							<p className="font-medium">{formatDateTime(data.run.createdAt)}</p>
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
									{readinessData?.status === "PASSED" && (
										<Button variant="secondary" size="sm" asChild>
											<Link to="/mes/loading" search={{ runNo }}>
												<Package className="mr-2 h-4 w-4" />
												前往上料
											</Link>
										</Button>
									)}
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
										<p className="font-medium">{formatDateTime(readinessData.checkedAt)}</p>
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
																	{formatDateTime(item.waivedAt)}
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
								<Button
									variant="default"
									size="sm"
									onClick={() => {
										setPendingTrialLaunch(false);
										setFaiDialogOpen(true);
									}}
								>
									<Plus className="mr-2 h-4 w-4" />
									创建并开始试产
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
							<div className="space-y-4">
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
										<p className="font-medium">{formatDateTime(existingFai.createdAt)}</p>
									</div>
								</div>
								{existingFai.status === "INSPECTING" && (
									<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
										<span className="text-muted-foreground">完成试产后返回 FAI 判定。</span>
										<Button variant="outline" size="sm" onClick={handleTrialExecution}>
											<Play className="mr-2 h-4 w-4" />
											进入试产执行
										</Button>
									</div>
								)}
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
									<p className="font-medium">{formatDateTime(oqcDetail.createdAt)}</p>
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
						<CardTitle>路由进度</CardTitle>
						<CardDescription>查看各工序完成情况</CardDescription>
					</div>
					<Package className="h-5 w-5 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{data.routeSteps.length === 0 ? (
						<div className="py-6 text-center text-muted-foreground">暂无路由步骤</div>
					) : (
						<div className="space-y-4">
							{data.routeSteps.map((step) => {
								const progress =
									step.total > 0 ? Math.min((step.completed / step.total) * 100, 100) : 0;
								return (
									<div key={step.stepNo} className="space-y-2">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div>
												<p className="text-sm font-medium">{formatStepLabel(step)}</p>
												<p className="text-xs text-muted-foreground">{formatStepStation(step)}</p>
											</div>
											<p className="text-sm text-muted-foreground">
												{step.completed}/{step.total} 完成
											</p>
										</div>
										<Progress value={progress} />
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Unit 列表</CardTitle>
						<CardDescription>展示批次下产品当前进度</CardDescription>
					</div>
					<Package className="h-5 w-5 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{runUnitsLoading ? (
						<div className="py-8 text-center text-muted-foreground">加载中...</div>
					) : !runUnits || runUnits.items.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">暂无生产记录</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>序列号 (SN)</TableHead>
									<TableHead>当前步骤</TableHead>
									<TableHead>下一步</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>更新时间</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{runUnits.items.map((unit) => (
									<TableRow key={unit.sn}>
										<TableCell className="font-mono">{unit.sn}</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div className="text-sm font-medium">
													{formatStepLabel(unit.currentStep)}
												</div>
												<div className="text-xs text-muted-foreground">
													{formatStepStation(unit.currentStep)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div className="text-sm font-medium">{formatStepLabel(unit.nextStep)}</div>
												<div className="text-xs text-muted-foreground">
													{formatStepStation(unit.nextStep)}
												</div>
											</div>
										</TableCell>
										<TableCell>{getUnitStatusBadge(unit.status)}</TableCell>
										<TableCell className="text-muted-foreground">
											{formatDateTime(unit.updatedAt)}
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

					{runUnits && runUnits.total > 0 && (
						<div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
							<span>
								共 {runUnits.total} 条 · 第 {unitsPage}/
								{Math.max(1, Math.ceil(runUnits.total / unitsPageSize))} 页
							</span>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={unitsPage <= 1 || runUnitsFetching}
									onClick={() => setUnitsPage((current) => Math.max(1, current - 1))}
								>
									上一页
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={
										runUnitsFetching ||
										unitsPage >= Math.max(1, Math.ceil(runUnits.total / unitsPageSize))
									}
									onClick={() =>
										setUnitsPage((current) =>
											Math.min(Math.max(1, Math.ceil(runUnits.total / unitsPageSize)), current + 1),
										)
									}
								>
									下一页
								</Button>
							</div>
						</div>
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
			<Dialog open={faiDialogOpen} onOpenChange={handleFaiDialogOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>创建首件检验 (FAI)</DialogTitle>
						<DialogDescription>为批次 {runNo} 创建首件检验任务并开始试产</DialogDescription>
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
						<Button variant="outline" onClick={() => handleFaiDialogOpenChange(false)}>
							取消
						</Button>
						<Button onClick={handleCreateFai} disabled={faiSampleQty < 1 || createFai.isPending}>
							{createFai.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							创建并开始试产
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Generate Units Dialog */}
			<Dialog open={generateUnitsDialogOpen} onOpenChange={handleGenerateUnitsDialogChange}>
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
								max={data.run.planQty}
								value={generateUnitsQty}
								onChange={(e) => setGenerateUnitsQty(Number.parseInt(e.target.value, 10) || 1)}
								placeholder="输入生成数量"
							/>
							<p className="text-xs text-muted-foreground">
								将生成 {generateUnitsQty} 个单件，SN 格式: SN-{runNo}-0001 ~ SN-{runNo}-
								{String(generateUnitsQty).padStart(4, "0")}
							</p>
							<p className="text-xs text-muted-foreground">最大数量: {data.run.planQty}</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => handleGenerateUnitsDialogChange(false)}>
							取消
						</Button>
						<Button
							onClick={handleGenerateUnitsConfirm}
							disabled={
								generateUnitsQty < 1 ||
								generateUnitsQty > data.run.planQty ||
								generateUnits.isPending
							}
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
