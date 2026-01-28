import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ClipboardCheck,
	ExternalLink,
	Loader2,
	Package,
	Pen,
	Play,
	Plus,
	RefreshCw,
	Settings,
	Shield,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
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
import { Textarea } from "@/components/ui/textarea";
import { useAbility } from "@/hooks/use-ability";
import { useCreateFai, useFaiByRun, useFaiGate, useSignFai, useStartFai } from "@/hooks/use-fai";
import { useMrbDecision, useOqcByRun } from "@/hooks/use-oqc";
import {
	type ReadinessCheckItem,
	type ReadinessItemType,
	usePerformPrecheck,
	useReadinessConfig,
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

const PREP_CHECKLIST_TEMPLATE = [
	{ title: "烘烤", itemTypes: ["PREP_BAKE"] },
	{ title: "辅料", itemTypes: ["PREP_PASTE"] },
	{
		title: "钢网/刮刀/夹具",
		itemTypes: ["PREP_STENCIL_USAGE", "PREP_STENCIL_CLEAN", "PREP_SCRAPER", "PREP_FIXTURE"],
	},
	{ title: "程式", itemTypes: ["PREP_PROGRAM"] },
	{ title: "时间窗口", itemTypes: ["TIME_RULE"] },
] as const;

function RunDetailPage() {
	const { runNo } = Route.useParams();
	const navigate = useNavigate();
	const { hasPermission } = useAbility();
	const canViewRun = hasPermission(Permission.RUN_READ);
	const canViewReadiness = hasPermission(Permission.READINESS_VIEW);
	const canCheckReadiness = hasPermission(Permission.READINESS_CHECK);
	const canOverrideReadiness = hasPermission(Permission.READINESS_OVERRIDE);
	const canViewFai = hasPermission(Permission.QUALITY_FAI);
	const canViewOqc = hasPermission(Permission.QUALITY_OQC);
	const canViewLoading = hasPermission(Permission.LOADING_VIEW);
	const canConfigLoading = hasPermission(Permission.LOADING_CONFIG);
	const canViewRoutes = hasPermission(Permission.ROUTE_READ);
	const canViewIntegration = hasPermission(Permission.SYSTEM_INTEGRATION);
	const canGenerateUnits = hasPermission(Permission.RUN_AUTHORIZE);
	const { data, isLoading, refetch, isFetching } = useRunDetail(runNo, {
		enabled: canViewRun,
	});
	const authorizeRun = useAuthorizeRun();
	const closeRun = useCloseRun();
	const generateUnits = useGenerateUnits();
	const [unitsPage, setUnitsPage] = useState(1);
	const unitsPageSize = 50;
	const {
		data: runUnits,
		isLoading: runUnitsLoading,
		isFetching: runUnitsFetching,
	} = useRunUnits({ runNo, page: unitsPage, pageSize: unitsPageSize }, { enabled: canViewRun });
	const {
		data: readinessData,
		isLoading: readinessLoading,
		refetch: refetchReadiness,
	} = useReadinessLatest(runNo, undefined, { enabled: canViewReadiness });
	const { data: readinessConfig } = useReadinessConfig(data?.line?.id, {
		enabled: canViewReadiness,
	});

	// FAI hooks
	const { data: faiGate, isLoading: faiGateLoading } = useFaiGate(runNo, {
		enabled: canViewFai,
	});
	const {
		data: existingFai,
		isLoading: faiLoading,
		refetch: refetchFai,
	} = useFaiByRun(runNo, { enabled: canViewFai });
	const createFai = useCreateFai();
	const startFai = useStartFai();
	const signFai = useSignFai();

	// OQC & MRB hooks
	const { data: oqcDetail, isLoading: oqcLoading } = useOqcByRun(runNo, {
		enabled: canViewOqc,
	});
	const mrbDecision = useMrbDecision();

	const performPrecheck = usePerformPrecheck();
	const waiveItem = useWaiveItem();

	// Auto-refresh readiness check on page load for PREP status
	const hasAutoChecked = useRef(false);
	const runId = data?.run?.id;
	const runStatus = data?.run?.status;
	useEffect(() => {
		if (!runId || runStatus !== "PREP") return;
		if (!canCheckReadiness) return;
		if (hasAutoChecked.current) return;
		hasAutoChecked.current = true;
		// Silently trigger a precheck to refresh readiness status
		performPrecheck
			.mutateAsync(runNo)
			.then(() => refetchReadiness())
			.catch(() => {});
	}, [runId, runStatus, runNo, canCheckReadiness, performPrecheck, refetchReadiness]);

	const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ReadinessCheckItem | null>(null);
	const [waiveReason, setWaiveReason] = useState("");
	const readinessCardRef = useRef<HTMLDivElement | null>(null);
	const readinessItemsByType = useMemo(() => {
		const map = new Map<string, ReadinessCheckItem[]>();
		for (const item of readinessData?.items ?? []) {
			const items = map.get(item.itemType) ?? [];
			items.push(item);
			map.set(item.itemType, items);
		}
		return map;
	}, [readinessData?.items]);
	const readinessConfigLoaded = readinessConfig !== undefined && readinessConfig !== null;
	const enabledReadinessTypes = useMemo(
		() => new Set<ReadinessItemType>(readinessConfig?.enabled ?? []),
		[readinessConfig?.enabled],
	);

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

	// FAI sign dialog state
	const [faiSignDialogOpen, setFaiSignDialogOpen] = useState(false);
	const [faiSignRemark, setFaiSignRemark] = useState("");

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

	type ReadinessAction = {
		label: string;
		to: string;
		params?: Record<string, string>;
		search?: Record<string, unknown>;
	};

	type ReadinessItemAction = {
		primaryAction?: ReadinessAction;
		secondaryAction?: ReadinessAction;
		disabledReason?: string;
	};

	const buildAction = (
		label: string,
		to: string,
		options?: { params?: Record<string, string>; search?: Record<string, unknown> },
	): ReadinessAction => ({
		label,
		to,
		params: options?.params,
		search: options?.search,
	});

	const getReadinessItemAction = (item: ReadinessCheckItem): ReadinessItemAction => {
		if (!data) return {};

		const lineId = data.line?.id;
		const lineCode = data.line?.code;
		const routingCode = data.routeVersion?.route?.code;
		let primaryAction: ReadinessAction | undefined;
		let secondaryAction: ReadinessAction | undefined;
		let disabledReason: string | undefined;

		const setDisabled = (reason?: string) => {
			if (!disabledReason && reason) disabledReason = reason;
		};

		switch (item.itemType) {
			case "LOADING":
				if (item.itemKey === "SLOT_TABLE") {
					primaryAction = buildAction("配置站位表", "/mes/loading/slot-config", {
						search: { lineId },
					});
					if (!canConfigLoading) setDisabled("无权限配置站位表");
					if (!lineId) setDisabled("缺少产线信息");
				} else {
					primaryAction = buildAction("前往上料", "/mes/loading", { search: { runNo } });
					if (!canViewLoading) setDisabled("无权限查看上料");
				}
				break;
			case "ROUTE":
				primaryAction = routingCode
					? buildAction("查看路由", "/mes/routes/$routingCode", {
							params: { routingCode },
						})
					: buildAction("工艺管理", "/mes/routes");
				if (!canViewRoutes) setDisabled("无权限查看工艺路线");
				break;
			case "MATERIAL":
				primaryAction = buildAction("物料管理", "/mes/materials", {
					search: { search: item.itemKey },
				});
				if (!canViewRoutes) setDisabled("无权限查看物料");
				break;
			case "EQUIPMENT":
				primaryAction = buildAction("设备管理", "/mes/integration/status");
				if (!canViewIntegration) setDisabled("无权限查看设备状态");
				break;
			case "STENCIL":
				primaryAction = buildAction("钢网管理", "/mes/integration/manual-entry");
				if (!canViewIntegration) setDisabled("无权限查看钢网");
				break;
			case "SOLDER_PASTE":
				primaryAction = buildAction("锡膏管理", "/mes/integration/manual-entry");
				if (!canViewIntegration) setDisabled("无权限查看锡膏");
				break;
			case "PREP_BAKE":
				primaryAction = buildAction("烘烤记录", "/mes/bake-records", {
					search: { runNo: data.run.runNo },
				});
				break;
			case "PREP_PASTE":
				primaryAction = buildAction("锡膏记录", "/mes/solder-paste-usage", {
					search: { runNo: data.run.runNo, lineCode },
				});
				break;
			case "PREP_STENCIL_USAGE":
				primaryAction = buildAction("钢网使用", "/mes/stencil-usage", {
					search: { runNo: data.run.runNo, lineCode },
				});
				break;
			case "PREP_STENCIL_CLEAN":
				primaryAction = buildAction("清洗记录", "/mes/stencil-cleaning", {
					search: { runNo: data.run.runNo, lineCode },
				});
				break;
			case "PREP_SCRAPER":
				primaryAction = buildAction("刮刀点检", "/mes/squeegee-usage", {
					search: { runNo: data.run.runNo, lineCode },
				});
				break;
			case "PREP_FIXTURE":
				primaryAction = buildAction("夹具维护", "/mes/maintenance-records", {
					search: { entityType: "FIXTURE", lineId },
				});
				if (!lineId) setDisabled("缺少产线信息");
				break;
			case "PREP_PROGRAM":
				primaryAction = buildAction("程式记录", "/mes/oven-program-records", {
					search: { lineCode },
				});
				if (!lineCode) setDisabled("缺少产线信息");
				break;
			case "TIME_RULE":
				primaryAction = buildAction("时间规则", "/mes/time-rules");
				break;
			default:
				break;
		}

		if (!primaryAction) return {};
		if (runStatus !== "PREP") setDisabled("仅 PREP 阶段可处理");

		return { primaryAction, secondaryAction, disabledReason };
	};

	const getTemplateStatus = (itemType: ReadinessItemType) => {
		if (readinessConfigLoaded && !enabledReadinessTypes.has(itemType)) {
			return { status: "DISABLED", count: 0 };
		}
		const items = readinessItemsByType.get(itemType) ?? [];
		if (items.length === 0) {
			return { status: "UNSET", count: 0 };
		}
		if (items.some((item) => item.status === "FAILED")) {
			return { status: "FAILED", count: items.length };
		}
		if (items.some((item) => item.status === "WAIVED")) {
			return { status: "WAIVED", count: items.length };
		}
		return { status: "PASSED", count: items.length };
	};

	const getTemplateStatusBadge = (status: string) => {
		if (status === "DISABLED") {
			return <Badge variant="outline">未启用</Badge>;
		}
		if (status === "UNSET") {
			return <Badge variant="outline">未检查</Badge>;
		}
		return getItemStatusBadge(status);
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

	const handleRunCheck = async () => {
		await performPrecheck.mutateAsync(runNo);
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
		const remaining = data.run.planQty - (data.unitStats.total ?? 0);
		setGenerateUnitsQty(Math.min(quantity, remaining));
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

	const handleFaiSign = async () => {
		if (!existingFai?.id) return;
		try {
			await signFai.mutateAsync({ faiId: existingFai.id, remark: faiSignRemark || undefined });
			setFaiSignDialogOpen(false);
			setFaiSignRemark("");
			refetchFai();
		} catch {
			// Toast handled in mutation onError
		}
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

	if (!canViewRun) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/mes/runs">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">批次详情</h1>
						<p className="text-muted-foreground">批次号：{runNo}</p>
					</div>
				</div>
				<NoAccessCard description="需要批次查看权限才能访问该页面。" />
			</div>
		);
	}

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
	const canShowReadinessActions = isInPrepStatus && canViewReadiness && canCheckReadiness;
	const canWaiveReadiness = canViewReadiness && canOverrideReadiness;
	const canCreateFai = canViewFai && canShowReadinessActions;
	const readinessStatus = canViewReadiness ? (readinessData?.status ?? "PENDING") : "UNKNOWN";
	const readinessStageLabel = !canViewReadiness
		? "无权限"
		: readinessLoading
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
	const requiresFai = canViewFai ? (faiGate?.requiresFai ?? false) : false;
	const faiStage = (() => {
		if (!canViewFai) {
			return { label: "无权限", variant: "outline" as const };
		}
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
	const scrollToReadiness = () => {
		readinessCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};
	const firstFailedItem = readinessData?.items.find((item) => item.status === "FAILED");
	const firstFailedAction = firstFailedItem ? getReadinessItemAction(firstFailedItem) : null;
	const authorizeBlockedReason = (() => {
		if (canViewReadiness && readinessStatus !== "PASSED") {
			return "需先处理就绪检查失败项或执行检查";
		}
		if (requiresFai && !faiGate?.faiPassed) {
			return "需先完成 FAI";
		}
		if (requiresFai && faiGate?.faiPassed && !faiGate?.faiSigned) {
			return "需先完成 FAI 签字";
		}
		return undefined;
	})();
	const nextAction = (() => {
		if (!canViewReadiness) return null;
		if (readinessStatus === "FAILED") {
			const action = firstFailedAction?.primaryAction;
			if (action) {
				return {
					label: action.label,
					onClick: () =>
						navigate({
							to: action.to,
							params: action.params,
							search: action.search,
						}),
					disabled: Boolean(firstFailedAction?.disabledReason),
					disabledReason: firstFailedAction?.disabledReason,
				};
			}
			return { label: "查看就绪检查", onClick: scrollToReadiness };
		}
		if (readinessStatus !== "PASSED") {
			if (!canCheckReadiness) {
				return {
					label: "等待准备检查",
					disabled: true,
					disabledReason: "无执行准备检查权限",
				};
			}
			return {
				label: "执行准备检查",
				onClick: async () => {
					await handleRunCheck();
					scrollToReadiness();
				},
				disabled: performPrecheck.isPending,
			};
		}
		if (canViewFai && (requiresFai || existingFai)) {
			if (!existingFai) {
				return {
					label: "创建并开始试产",
					onClick: () => {
						setPendingTrialLaunch(true);
						setFaiDialogOpen(true);
					},
				};
			}
			if (existingFai.status === "INSPECTING") {
				return { label: "试产执行", onClick: handleTrialExecution };
			}
			if (existingFai.status === "FAIL") {
				return {
					label: "查看 FAI",
					onClick: () => navigate({ to: "/mes/fai", search: { runNo } }),
				};
			}
			if (existingFai.status !== "PASS") {
				return {
					label: "完成 FAI",
					onClick: () => navigate({ to: "/mes/fai", search: { runNo } }),
				};
			}
			if (requiresFai && faiGate?.faiPassed && !faiGate?.faiSigned) {
				return { label: "FAI 签字", onClick: () => setFaiSignDialogOpen(true) };
			}
		}
		if (data.run.status === "PREP") {
			return {
				label: "授权生产",
				onClick: () => handleAuthorize("AUTHORIZE"),
				disabled: Boolean(authorizeBlockedReason),
				disabledReason: authorizeBlockedReason,
			};
		}
		if (data.run.status === "AUTHORIZED") {
			return { label: "开始执行", onClick: navigateToExecution };
		}
		if (data.run.status === "IN_PROGRESS") {
			return { label: "收尾", onClick: () => setCloseoutDialogOpen(true) };
		}
		return null;
	})();
	const trialCta =
		canViewFai && data.run.status === "PREP"
			? (() => {
					if (canViewReadiness && readinessStatus !== "PASSED") {
						return {
							label: "试产执行",
							disabled: true,
							disabledReason: "需先通过就绪检查",
						};
					}
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
						return { label: "FAI 未通过", disabled: true, disabledReason: "FAI 未通过" };
					}
					return { label: "等待授权", disabled: true };
				})()
			: null;
	const authorizeDisabled = authorizeRun.isPending || Boolean(authorizeBlockedReason);
	const canShowFaiSection = canViewFai ? Boolean(faiGate?.requiresFai || existingFai) : true;
	const canShowOqcSection = canViewOqc ? Boolean(oqcDetail || oqcLoading) : true;

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
							<div className="flex flex-col items-start">
								<Button
									size="sm"
									onClick={() => handleAuthorize("AUTHORIZE")}
									disabled={authorizeDisabled}
									title={authorizeBlockedReason}
								>
									<CheckCircle2 className="mr-2 h-4 w-4" />
									授权生产
								</Button>
								{authorizeBlockedReason && (
									<span className="mt-1 text-xs text-muted-foreground">
										{authorizeBlockedReason}
									</span>
								)}
							</div>
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
								title={trialCta.disabledReason}
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

			<CollapsibleCard
				title="流程进度"
				description="就绪检查 → 首件检验 → 授权生产 → 批次执行 → 收尾"
			>
				<div className="space-y-4">
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
							<Button
								variant="secondary"
								size="sm"
								onClick={nextAction.onClick}
								disabled={nextAction.disabled}
								title={nextAction.disabledReason}
							>
								{nextAction.label}
							</Button>
						</div>
					)}
				</div>
			</CollapsibleCard>

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
						{data.unitStats.total < data.run.planQty &&
						(data.run.status === "PREP" || data.run.status === "AUTHORIZED") ? (
							canGenerateUnits ? (
								<Button
									variant="outline"
									size="sm"
									className="mt-2"
									onClick={() => setGenerateUnitsDialogOpen(true)}
								>
									<Plus className="mr-1 h-3 w-3" />
									{data.unitStats.total === 0 ? "生成单件" : "追加单件"}
								</Button>
							) : (
								<p className="text-xs text-muted-foreground mt-2">无权限生成单件</p>
							)
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

				<CollapsibleCard
					title="转拉前检查模板"
					icon={<ClipboardCheck className="h-5 w-5 text-blue-600" />}
					description="静态模板（QR-Pro-133）展示准备项与时间窗口状态，完整检查明细请参考上方准备状态。"
					className="lg:col-span-4"
					defaultOpen={false}
				>
					{!canViewReadiness ? (
						<NoAccessCard description="无权限查看准备检查状态。" />
					) : readinessLoading ? (
						<p className="text-muted-foreground">加载中...</p>
					) : !readinessData ? (
						<div className="py-4 text-center text-muted-foreground">
							<p>暂无检查记录</p>
							{canShowReadinessActions && (
								<p className="text-sm mt-1">请先完成准备检查以生成模板结果</p>
							)}
						</div>
					) : (
						<div className="space-y-6">
							{PREP_CHECKLIST_TEMPLATE.map((section) => (
								<div key={section.title} className="space-y-2">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium">{section.title}</p>
										{(() => {
											if (!canShowReadinessActions) return null;
											const failedItem = section.itemTypes
												.flatMap((itemType) => readinessItemsByType.get(itemType) ?? [])
												.find((item) => item.status === "FAILED");
											if (!failedItem) return null;
											const action = getReadinessItemAction(failedItem);
											if (!action.primaryAction) return null;
											if (action.disabledReason) {
												return (
													<Button variant="ghost" size="sm" disabled title={action.disabledReason}>
														去处理
													</Button>
												);
											}
											return (
												<Button variant="ghost" size="sm" asChild>
													<Link
														to={action.primaryAction.to}
														params={action.primaryAction.params}
														search={action.primaryAction.search}
													>
														去处理
													</Link>
												</Button>
											);
										})()}
									</div>
									<div className="grid gap-2 md:grid-cols-2">
										{section.itemTypes.map((itemType) => {
											const { status, count } = getTemplateStatus(itemType);
											return (
												<div
													key={itemType}
													className="flex items-center justify-between rounded-md border px-3 py-2"
												>
													<div>
														<p className="text-sm font-medium">{getItemTypeLabel(itemType)}</p>
														{count > 1 && (
															<p className="text-xs text-muted-foreground">{count} 项</p>
														)}
													</div>
													{getTemplateStatusBadge(status)}
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					)}
				</CollapsibleCard>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<CollapsibleCard title="批次信息">
					<div className="grid gap-4 md:grid-cols-2">
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
					</div>
				</CollapsibleCard>

				<CollapsibleCard title="路由版本">
					{data.routeVersion ? (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<p className="text-sm text-muted-foreground">路由编码</p>
								{canViewRoutes ? (
									<Link
										to="/mes/routes/$routingCode"
										params={{ routingCode: data.routeVersion.route.code }}
										className="font-medium text-primary hover:underline"
									>
										{data.routeVersion.route.code}
									</Link>
								) : (
									<p className="font-medium text-muted-foreground">
										{data.routeVersion.route.code}
									</p>
								)}
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
				</CollapsibleCard>

				<div ref={readinessCardRef} className="lg:col-span-2">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									{canViewReadiness ? (
										readinessLoading ? (
											<Loader2 className="h-5 w-5 animate-spin" />
										) : !readinessData ? (
											<AlertTriangle className="h-5 w-5 text-yellow-600" />
										) : readinessData.status === "PASSED" ? (
											<CheckCircle2 className="h-5 w-5 text-green-600" />
										) : (
											<XCircle className="h-5 w-5 text-red-600" />
										)
									) : (
										<Shield className="h-5 w-5 text-muted-foreground" />
									)}
									准备状态
								</CardTitle>
								{canViewReadiness && canShowReadinessActions && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleRunCheck()}
											disabled={performPrecheck.isPending}
										>
											{performPrecheck.isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<RefreshCw className="h-4 w-4" />
											)}
										</Button>
										{readinessData?.status === "PASSED" &&
											(canViewLoading ? (
												<Button variant="secondary" size="sm" asChild>
													<Link to="/mes/loading" search={{ runNo }}>
														<Package className="mr-2 h-4 w-4" />
														前往上料
													</Link>
												</Button>
											) : (
												<Button variant="secondary" size="sm" disabled>
													<Package className="mr-2 h-4 w-4" />
													前往上料
												</Button>
											))}
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{!canViewReadiness ? (
								<NoAccessCard description="无权限查看准备检查状态。" />
							) : readinessLoading ? (
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
												通过: {readinessData.summary.passed} · 失败: {readinessData.summary.failed}{" "}
												· 豁免: {readinessData.summary.waived}
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
																	<div className="flex items-center gap-1">
																		{canWaiveReadiness && (
																			<Button
																				variant="ghost"
																				size="sm"
																				onClick={() => handleWaive(item)}
																			>
																				<Shield className="mr-1 h-3 w-3" />
																				豁免
																			</Button>
																		)}
																		{(() => {
																			const action = getReadinessItemAction(item);
																			const primaryAction = action.primaryAction;
																			if (!primaryAction) return null;
																			const ActionIcon =
																				primaryAction.to === "/mes/loading/slot-config"
																					? Settings
																					: ExternalLink;
																			if (action.disabledReason) {
																				return (
																					<Button
																						variant="ghost"
																						size="sm"
																						disabled
																						title={action.disabledReason}
																					>
																						<ActionIcon className="mr-1 h-3 w-3" />
																						{primaryAction.label}
																					</Button>
																				);
																			}
																			return (
																				<Button variant="ghost" size="sm" asChild>
																					<Link
																						to={primaryAction.to}
																						params={primaryAction.params}
																						search={primaryAction.search}
																					>
																						<ActionIcon className="mr-1 h-3 w-3" />
																						{primaryAction.label}
																					</Link>
																				</Button>
																			);
																		})()}
																	</div>
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
			</div>

			{/* FAI Card - show placeholder when lacking permission */}
			{canShowFaiSection && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								{!canViewFai ? (
									<Shield className="h-5 w-5 text-muted-foreground" />
								) : faiLoading || faiGateLoading ? (
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
							{canCreateFai && !existingFai && (
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
						{!canViewFai ? (
							<NoAccessCard description="无权限查看首件检验状态。" />
						) : faiLoading || faiGateLoading ? (
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
								{/* FAI Signature Status */}
								{existingFai.status === "PASS" && (
									<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
										{existingFai.signedBy ? (
											<div className="flex items-center gap-2">
												<CheckCircle2 className="h-4 w-4 text-green-600" />
												<span>
													已签字确认 ({formatDateTime(existingFai.signedAt)})
													{existingFai.signatureRemark && (
														<span className="text-muted-foreground ml-2">
															备注: {existingFai.signatureRemark}
														</span>
													)}
												</span>
											</div>
										) : (
											<>
												<span className="text-muted-foreground">
													FAI 已通过，需签字确认后才能授权量产。
												</span>
												<Button
													variant="default"
													size="sm"
													onClick={() => setFaiSignDialogOpen(true)}
													disabled={signFai.isPending}
												>
													<Pen className="mr-2 h-4 w-4" />
													签字确认
												</Button>
											</>
										)}
									</div>
								)}
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
								{canCreateFai && <p className="text-sm mt-1">点击上方按钮创建 FAI 任务</p>}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{canShowOqcSection && (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<CardTitle className="flex items-center gap-2">
								{!canViewOqc ? (
									<Shield className="h-5 w-5 text-muted-foreground" />
								) : oqcLoading ? (
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
							{canViewOqc && (
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
							)}
						</div>
					</CardHeader>
					<CardContent>
						{!canViewOqc ? (
							<NoAccessCard description="无权限查看出货检验状态。" />
						) : oqcLoading ? (
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

			<CollapsibleCard
				title="路由进度"
				description="查看各工序完成情况"
				icon={<Package className="h-5 w-5 text-muted-foreground" />}
			>
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
			</CollapsibleCard>

			<CollapsibleCard
				title="Unit 列表"
				description="展示批次下产品当前进度"
				icon={<Package className="h-5 w-5 text-muted-foreground" />}
			>
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
											<div className="text-sm font-medium">{formatStepLabel(unit.currentStep)}</div>
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
			</CollapsibleCard>

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

			{/* FAI Sign Dialog */}
			<Dialog open={faiSignDialogOpen} onOpenChange={setFaiSignDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>FAI 签字确认</DialogTitle>
						<DialogDescription>
							确认首件检验已通过审核，签字后将允许批次进行量产授权。
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="faiSignRemark">备注（可选）</Label>
							<Textarea
								id="faiSignRemark"
								value={faiSignRemark}
								onChange={(e) => setFaiSignRemark(e.target.value)}
								placeholder="输入签字备注..."
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFaiSignDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleFaiSign} disabled={signFai.isPending}>
							{signFai.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							确认签字
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Generate Units Dialog */}
			<Dialog open={generateUnitsDialogOpen} onOpenChange={handleGenerateUnitsDialogChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{data.unitStats.total === 0 ? "生成单件" : "追加单件"}</DialogTitle>
						<DialogDescription>为批次 {runNo} 生成单件序列号</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="generateUnitsQty">生成数量</Label>
							<Input
								id="generateUnitsQty"
								type="number"
								min={1}
								max={data.run.planQty - data.unitStats.total}
								value={generateUnitsQty}
								onChange={(e) => setGenerateUnitsQty(Number.parseInt(e.target.value, 10) || 1)}
								placeholder="输入生成数量"
							/>
							<p className="text-xs text-muted-foreground">
								将生成 {generateUnitsQty} 个单件，SN 格式: SN-{runNo}-
								{String(data.unitStats.total + 1).padStart(4, "0")} ~ SN-{runNo}-
								{String(data.unitStats.total + generateUnitsQty).padStart(4, "0")}
							</p>
							<p className="text-xs text-muted-foreground">
								已有 {data.unitStats.total} 个，计划 {data.run.planQty} 个，还可生成{" "}
								{data.run.planQty - data.unitStats.total} 个
							</p>
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
								generateUnitsQty > data.run.planQty - data.unitStats.total ||
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
