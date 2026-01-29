import { Permission } from "@better-app/db/permissions";
import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAbility } from "@/hooks/use-ability";
import { useRunDetail, useRunList, useRunUnits } from "@/hooks/use-runs";
import {
	useResolveUnitBySn,
	useStationQueue,
	useStations,
	useTrackIn,
} from "@/hooks/use-station-execution";
import { useUserProfile } from "@/hooks/use-users";
import { ApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/utils";
import { TrackOutDialog } from "./-components/track-out-dialog";

const searchSchema = z.object({
	runNo: z.string().optional(),
	woNo: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/mes/execution")({
	component: ExecutionPage,
	validateSearch: searchSchema,
});

const trackInSchema = z.object({
	sn: z.string().min(1, "序列号不能为空"),
	woNo: z.string().min(1, "工单号不能为空"),
	runNo: z.string().min(1, "批次号不能为空"),
});

const trackOutSchema = z.object({
	sn: z.string().min(1, "序列号不能为空"),
	runNo: z.string().min(1, "批次号不能为空"),
	result: z.enum(["PASS", "FAIL"]),
});

function ExecutionPage() {
	const searchParams = Route.useSearch();
	const [selectedStation, setSelectedStation] = useState<string>("");
	// State for TrackOut dialog with data collection
	const [trackOutDialogOpen, setTrackOutDialogOpen] = useState(false);
	const [trackOutItem, setTrackOutItem] = useState<{
		sn: string;
		runNo: string;
		initialResult?: "PASS" | "FAIL";
		lockResult?: boolean;
	} | null>(null);
	const isOutPending = trackOutDialogOpen;
	const stationStorageKey = "mes.execution.station";
	// Track if we've applied search params to avoid re-applying on re-renders
	const appliedSearchParamsRef = useRef(false);
	const { data: userProfile } = useUserProfile();
	const { hasPermission } = useAbility();
	const canTrackIn = hasPermission(Permission.EXEC_TRACK_IN);
	const canTrackOut = hasPermission(Permission.EXEC_TRACK_OUT);
	const canViewExec = hasPermission(Permission.EXEC_READ) || canTrackIn || canTrackOut;
	const canReadRun = hasPermission(Permission.RUN_READ);
	const canResolveUnit = canTrackIn || canTrackOut;
	const { data: stations } = useStations({ enabled: canViewExec });
	const {
		data: queueData,
		refetch: refetchQueue,
		isFetching: isQueueFetching,
	} = useStationQueue(selectedStation, { enabled: canViewExec });
	// Fetch executable runs (AUTHORIZED or PREP with active FAI for trial production)
	const { data: executableRuns, isFetching: isRunsFetching } = useRunList(
		{
			status: ["AUTHORIZED", "PREP", "IN_PROGRESS"],
			pageSize: 50,
			sort: "-updatedAt",
		},
		{ enabled: canReadRun },
	);
	const { mutateAsync: trackIn, isPending: isInPending } = useTrackIn();
	const { mutateAsync: resolveUnitBySn, isPending: isResolvingSn } = useResolveUnitBySn();
	const [resolveError, setResolveError] = useState<{
		sn: string;
		code: string;
		message: string;
	} | null>(null);
	const [showManualResolve, setShowManualResolve] = useState(false);
	const resolveTimerRef = useRef<number | null>(null);
	const lastResolvedSnRef = useRef<string>("");

	const trackInDefaults: z.infer<typeof trackInSchema> = { sn: "", woNo: "", runNo: "" };
	const trackOutDefaults: z.infer<typeof trackOutSchema> = { sn: "", runNo: "", result: "PASS" };

	const inForm = useForm({
		defaultValues: trackInDefaults,
		validators: {
			onChange: trackInSchema,
		},
		onSubmit: async ({ value: values }) => {
			if (!selectedStation || !canTrackIn) return;
			try {
				await trackIn({ stationCode: selectedStation, ...values });
				inForm.reset({ sn: "", woNo: values.woNo, runNo: values.runNo }); // Keep context
				refetchQueue();
				if (selectedRunNo) {
					refetchQueuedUnits();
				}
			} catch (error: unknown) {
				const apiError = error as ApiError;
				if (apiError?.code === "UNIT_OUT_FAILED") {
					toast.error("进站失败：待处置产品", {
						description:
							"该产品上次出站判定为不合格，需先在「质量处置」模块完成处置（返工/放行）后才能继续进站。",
						action: {
							label: "前往处置",
							onClick: () => {
								window.location.href = "/mes/defects";
							},
						},
						duration: 10000,
					});
				} else {
					toast.error("进站失败", {
						description: apiError?.message ?? "请检查序列号与工序匹配情况",
					});
				}
			}
		},
	});

	const outForm = useForm({
		defaultValues: trackOutDefaults,
		validators: {
			onChange: trackOutSchema,
		},
		onSubmit: async ({ value: values }) => {
			if (!selectedStation || !canTrackOut) return;
			handleOpenTrackOutDialog({
				sn: values.sn,
				runNo: values.runNo,
				initialResult: values.result,
			});
		},
	});

	const selectedRunNo = useStore(inForm.store, (state) => state.values.runNo);
	const selectedWoNo = useStore(inForm.store, (state) => state.values.woNo);
	const inSn = useStore(inForm.store, (state) => state.values.sn);
	const outSn = useStore(outForm.store, (state) => state.values.sn);

	const { data: selectedRunDetail } = useRunDetail(selectedRunNo, { enabled: canReadRun });
	const {
		data: queuedUnits,
		refetch: refetchQueuedUnits,
		isFetching: isQueuedFetching,
	} = useRunUnits(
		{
			runNo: selectedRunNo || undefined,
			status: "QUEUED",
			stationCode: selectedStation || undefined,
			pageSize: 50,
		},
		{ enabled: canReadRun },
	);

	useEffect(() => {
		return () => {
			if (resolveTimerRef.current) {
				window.clearTimeout(resolveTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const saved = window.localStorage.getItem(stationStorageKey);
		if (saved) {
			setSelectedStation(saved);
		}
	}, []);

	// Apply search params to prefill forms (only once on mount)
	useEffect(() => {
		if (appliedSearchParamsRef.current) return;
		if (searchParams.runNo || searchParams.woNo) {
			appliedSearchParamsRef.current = true;
			if (searchParams.runNo) {
				inForm.setFieldValue("runNo", searchParams.runNo);
				outForm.setFieldValue("runNo", searchParams.runNo);
			}
			if (searchParams.woNo) {
				inForm.setFieldValue("woNo", searchParams.woNo);
			}
		}
	}, [searchParams.runNo, searchParams.woNo, inForm, outForm]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (selectedStation) {
			window.localStorage.setItem(stationStorageKey, selectedStation);
		} else {
			window.localStorage.removeItem(stationStorageKey);
		}
	}, [selectedStation]);

	const availableStations = useMemo(() => {
		const items = stations?.items ?? [];
		const boundStationIds = new Set(userProfile?.stationIds ?? []);
		if (boundStationIds.size === 0) return items;
		return items.filter((station) => boundStationIds.has(station.id));
	}, [stations?.items, userProfile?.stationIds]);

	const runItems = canReadRun ? (executableRuns?.items ?? []) : [];

	const runOptions = useMemo(() => {
		const options = runItems.map((run) => ({
			value: run.runNo,
			label: [
				run.runNo,
				run.workOrder.woNo ? `WO:${run.workOrder.woNo}` : null,
				run.workOrder.productCode ? run.workOrder.productCode : null,
			]
				.filter(Boolean)
				.join(" · "),
		}));

		if (selectedRunNo && !options.some((option) => option.value === selectedRunNo)) {
			options.unshift({ value: selectedRunNo, label: selectedRunNo });
		}

		return options;
	}, [runItems, selectedRunNo]);

	const runByNo = useMemo(() => {
		return new Map(runItems.map((run) => [run.runNo, run] as const));
	}, [runItems]);

	const runsByWorkOrder = useMemo(() => {
		const map = new Map<string, typeof runItems>();
		for (const run of runItems) {
			const list = map.get(run.workOrder.woNo) ?? [];
			list.push(run);
			map.set(run.workOrder.woNo, list);
		}
		return map;
	}, [runItems]);

	const workOrderOptions = useMemo(() => {
		const seen = new Set<string>();
		const options =
			runItems
				.map((run) => {
					if (seen.has(run.workOrder.woNo)) return null;
					seen.add(run.workOrder.woNo);
					return {
						value: run.workOrder.woNo,
						label: [run.workOrder.woNo, run.workOrder.productCode].filter(Boolean).join(" · "),
					};
				})
				.filter((option): option is { value: string; label: string } => Boolean(option)) ?? [];

		if (selectedWoNo && !options.some((option) => option?.value === selectedWoNo)) {
			options.unshift({ value: selectedWoNo, label: selectedWoNo });
		}

		return options;
	}, [runItems, selectedWoNo]);

	useEffect(() => {
		if (!selectedStation) return;
		const isStillAvailable = availableStations.some((station) => station.code === selectedStation);
		if (!isStillAvailable) {
			setSelectedStation("");
		}
	}, [availableStations, selectedStation]);

	// Open TrackOut dialog with data collection
	const handleOpenTrackOutDialog = (item: {
		sn: string;
		runNo: string;
		initialResult?: "PASS" | "FAIL";
		lockResult?: boolean;
	}) => {
		setTrackOutItem(item);
		setTrackOutDialogOpen(true);
	};

	const handleTrackOutSuccess = () => {
		setTrackOutItem(null);
		outForm.reset({ sn: "", runNo: "", result: "PASS" });
		refetchQueue();
		if (selectedRunNo) {
			refetchQueuedUnits();
		}
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

	const formatStepDetail = (
		step:
			| {
					stepNo: number;
					operationCode: string;
					operationName: string | null;
					stationCodes: string[];
					stationGroup: { code: string; name: string } | null;
			  }
			| null
			| undefined,
	) => {
		const label = formatStepLabel(step);
		const station = formatStepStation(step);
		return station !== "-" ? `${label} · ${station}` : label;
	};

	const inUnitHint = useMemo(() => {
		const sn = inSn.trim();
		if (!sn) return null;
		return queuedUnits?.items.find((item) => item.sn === sn) ?? null;
	}, [inSn, queuedUnits?.items]);

	const outUnitHint = useMemo(() => {
		const sn = outSn.trim();
		if (!sn) return null;
		return queueData?.queue.find((item) => item.sn === sn) ?? null;
	}, [outSn, queueData?.queue]);

	// Select a run from the executable list and prefill forms
	const handleSelectRun = (run: { runNo: string; woNo: string }) => {
		inForm.setFieldValue("runNo", run.runNo);
		inForm.setFieldValue("woNo", run.woNo);
		outForm.setFieldValue("runNo", run.runNo);
	};

	const handleRunValueChange = (value: string) => {
		if (!value) {
			inForm.setFieldValue("runNo", "");
			outForm.setFieldValue("runNo", "");
			return;
		}
		const run = runByNo.get(value);
		if (run) {
			handleSelectRun({ runNo: run.runNo, woNo: run.workOrder.woNo });
			return;
		}
		inForm.setFieldValue("runNo", value);
		outForm.setFieldValue("runNo", value);
	};

	const handleWorkOrderValueChange = (value: string) => {
		if (!value) {
			inForm.setFieldValue("woNo", "");
			return;
		}
		inForm.setFieldValue("woNo", value);
		const runs = runsByWorkOrder.get(value) ?? [];
		if (runs.length === 1) {
			handleSelectRun({ runNo: runs[0].runNo, woNo: value });
			return;
		}
		if (selectedRunNo && runs.some((run) => run.runNo === selectedRunNo)) {
			return;
		}
		inForm.setFieldValue("runNo", "");
		outForm.setFieldValue("runNo", "");
	};

	const parseScanValue = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) return null;

		const keyedMatches = Array.from(
			trimmed.matchAll(/\b(SN|WO|WONO|RUN|RUNNO)\s*[:=]\s*([^,;|\s]+)/gi),
		);
		if (keyedMatches.length > 0) {
			const result: { sn?: string; woNo?: string; runNo?: string } = {};
			for (const match of keyedMatches) {
				const key = match[1].toUpperCase();
				const value = match[2]?.trim();
				if (!value) continue;
				if (key === "SN") result.sn = value;
				if (key === "WO" || key === "WONO") result.woNo = value;
				if (key === "RUN" || key === "RUNNO") result.runNo = value;
			}
			return Object.keys(result).length > 0 ? result : null;
		}

		const parts = trimmed.split(/[|,;\s]+/).filter(Boolean);
		if (parts.length >= 3) {
			return { sn: parts[0], woNo: parts[1], runNo: parts[2] };
		}

		return null;
	};

	const performResolve = async (trimmed: string, target: "in" | "out") => {
		setResolveError(null);
		setShowManualResolve(false);
		try {
			const resolved = await resolveUnitBySn({ sn: trimmed });
			lastResolvedSnRef.current = trimmed;

			if (target === "in") {
				const currentWoNo = inForm.getFieldValue("woNo");
				const currentRunNo = inForm.getFieldValue("runNo");
				if (!currentWoNo && resolved.woNo) {
					inForm.setFieldValue("woNo", resolved.woNo);
				}
				if (!currentRunNo && resolved.runNo) {
					inForm.setFieldValue("runNo", resolved.runNo);
				}
			} else {
				const currentRunNo = outForm.getFieldValue("runNo");
				if (!currentRunNo && resolved.runNo) {
					outForm.setFieldValue("runNo", resolved.runNo);
				}
			}
		} catch (error: unknown) {
			const apiError = error as ApiError;
			setResolveError({
				sn: trimmed,
				code: apiError?.code ?? "RESOLVE_FAILED",
				message: apiError?.message ?? "SN 自动补全解析失败，请检查序列号是否正确或手动输入。",
			});
			setShowManualResolve(true);
		}
	};

	const scheduleResolveFromSn = (sn: string, target: "in" | "out") => {
		if (!canResolveUnit) return;
		const trimmed = sn.trim();
		if (!trimmed) {
			setResolveError(null);
			return;
		}
		if (trimmed === lastResolvedSnRef.current) return;
		if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);

		resolveTimerRef.current = window.setTimeout(() => performResolve(trimmed, target), 250);
	};

	if (!canViewExec) {
		return <NoAccessCard description="需要工位执行权限才能访问该页面。" />;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">工位执行</h1>
				<p className="text-muted-foreground">执行产品的进站与出站操作</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>选择工位</CardTitle>
					<CardDescription>选择您当前操作的物理工位</CardDescription>
				</CardHeader>
				<CardContent>
					{availableStations.length === 0 ? (
						<div className="text-sm text-muted-foreground">
							当前账号未绑定可用工位，请联系管理员完成工位绑定后再操作。
						</div>
					) : (
						<Select value={selectedStation} onValueChange={setSelectedStation}>
							<SelectTrigger className="w-[300px]">
								<SelectValue placeholder="请选择工位..." />
							</SelectTrigger>
							<SelectContent>
								{availableStations.map((s) => (
									<SelectItem key={s.code} value={s.code}>
										{s.name} ({s.code}) - {s.line?.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</CardContent>
			</Card>

			{/* Executable Runs Card */}
			{canReadRun && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<div>
							<CardTitle>待执行批次</CardTitle>
							<CardDescription>选择批次快速预填表单</CardDescription>
						</div>
						{isRunsFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
					</CardHeader>
					<CardContent>
						{!executableRuns?.items || executableRuns.items.length === 0 ? (
							<div className="py-4 text-center text-sm text-muted-foreground">暂无待执行批次</div>
						) : (
							<div className="space-y-2">
								{executableRuns.items.slice(0, 5).map((run) => (
									<button
										key={run.runNo}
										type="button"
										className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-accent"
										onClick={() => handleSelectRun({ runNo: run.runNo, woNo: run.workOrder.woNo })}
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-medium">{run.runNo}</span>
												<Badge
													variant={
														run.status === "AUTHORIZED"
															? "default"
															: run.status === "IN_PROGRESS"
																? "default"
																: "outline"
													}
												>
													{run.status === "AUTHORIZED"
														? "已授权"
														: run.status === "IN_PROGRESS"
															? "生产中"
															: run.status === "PREP"
																? "准备中"
																: run.status}
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground">
												工单: {run.workOrder.woNo} · 产品: {run.workOrder.productCode}
											</div>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</button>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{selectedStation && (
				<div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
					<div className="space-y-6">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div>
									<CardTitle>当前队列</CardTitle>
									<CardDescription>{queueData?.station.name} - 在站产品</CardDescription>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => refetchQueue()}
									disabled={isQueueFetching}
								>
									<RefreshCw className={`h-4 w-4 ${isQueueFetching ? "animate-spin" : ""}`} />
								</Button>
							</CardHeader>
							<CardContent>
								{queueData?.queue.length === 0 ? (
									<div className="py-8 text-center text-muted-foreground">当前工位没有在站产品</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>SN</TableHead>
												<TableHead>步骤</TableHead>
												<TableHead>进站时间</TableHead>
												<TableHead>操作</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{queueData?.queue.map((item) => (
												<TableRow key={item.sn}>
													<TableCell
														className="font-mono text-sm max-w-[160px] truncate"
														title={item.sn}
													>
														{item.sn}
													</TableCell>
													<TableCell>
														<div className="space-y-1">
															<div>
																<div className="text-sm font-medium">
																	{formatStepLabel(item.currentStep)}
																</div>
																<div className="text-xs text-muted-foreground">
																	{formatStepStation(item.currentStep)}
																</div>
															</div>
															<div className="text-xs text-muted-foreground">
																下一步: {formatStepLabel(item.nextStep)}
																{formatStepStation(item.nextStep) !== "-" && (
																	<span> · {formatStepStation(item.nextStep)}</span>
																)}
															</div>
														</div>
													</TableCell>
													<TableCell className="text-muted-foreground">
														{formatDateTime(item.inAt)}
													</TableCell>
													<TableCell>
														<div className="flex flex-wrap gap-2">
															<Button
																variant="secondary"
																size="sm"
																disabled={!canTrackOut || isOutPending}
																onClick={() =>
																	handleOpenTrackOutDialog({
																		sn: item.sn,
																		runNo: item.runNo,
																		initialResult: "PASS",
																	})
																}
															>
																出站
															</Button>
															<Button
																variant="outline"
																size="sm"
																disabled={!canTrackOut || isOutPending}
																onClick={() =>
																	handleOpenTrackOutDialog({
																		sn: item.sn,
																		runNo: item.runNo,
																		initialResult: "FAIL",
																		lockResult: true,
																	})
																}
															>
																报不良
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div>
									<CardTitle>待进站</CardTitle>
									<CardDescription>
										{selectedRunNo ? `批次 ${selectedRunNo}` : "请选择批次"}
									</CardDescription>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										if (selectedRunNo) refetchQueuedUnits();
									}}
									disabled={!selectedRunNo || isQueuedFetching}
								>
									<RefreshCw className={`h-4 w-4 ${isQueuedFetching ? "animate-spin" : ""}`} />
								</Button>
							</CardHeader>
							<CardContent>
								{!canReadRun ? (
									<NoAccessCard description="需要批次查看权限才能查看待进站列表。" />
								) : (
									<>
										{selectedRunDetail?.faiTrial && selectedRunDetail.run.status === "PREP" && (
											<div className="mb-4 rounded-lg border bg-muted/30 p-3">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div className="flex items-center gap-2 text-sm">
														<Badge variant="secondary">FAI 试产</Badge>
														<span className="text-muted-foreground">
															已试产 {selectedRunDetail.faiTrial.trackedQty}/
															{selectedRunDetail.faiTrial.sampleQty}
														</span>
													</div>
													<span className="text-xs text-muted-foreground">
														{selectedRunDetail.faiTrial.status}
													</span>
												</div>
												<Progress
													className="mt-2"
													value={
														selectedRunDetail.faiTrial.sampleQty > 0
															? (selectedRunDetail.faiTrial.trackedQty /
																	selectedRunDetail.faiTrial.sampleQty) *
																100
															: 0
													}
												/>
											</div>
										)}
										{selectedRunDetail && selectedRunDetail.run.status === "PREP" && (
											<div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
												<p className="font-medium text-foreground">FAI 试产规则</p>
												<ul className="mt-2 list-disc space-y-1 pl-4">
													<li>仅在第一工序进行首件试产</li>
													<li>
														需完成{" "}
														{selectedRunDetail.faiTrial?.sampleQty
															? `${selectedRunDetail.faiTrial.sampleQty} 个`
															: "指定数量的"}{" "}
														Unit TrackIn/TrackOut
													</li>
													<li>试产完成后返回 FAI 页面记录检验项并判定</li>
												</ul>
											</div>
										)}

										{!selectedRunNo ? (
											<div className="py-8 text-center text-muted-foreground">
												请选择批次以查看待进站产品
											</div>
										) : isQueuedFetching && !queuedUnits ? (
											<div className="py-8 text-center text-muted-foreground">加载中...</div>
										) : !queuedUnits || queuedUnits.items.length === 0 ? (
											<div className="py-8 text-center text-muted-foreground">暂无待进站产品</div>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>SN</TableHead>
														<TableHead>步骤</TableHead>
														<TableHead>操作</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{queuedUnits?.items.map((item) => (
														<TableRow key={item.sn}>
															<TableCell
																className="font-mono text-sm max-w-[160px] truncate"
																title={item.sn}
															>
																{item.sn}
															</TableCell>
															<TableCell>
																<div className="space-y-1">
																	<div>
																		<div className="text-sm font-medium">
																			{formatStepLabel(item.currentStep)}
																		</div>
																		<div className="text-xs text-muted-foreground">
																			{formatStepStation(item.currentStep)}
																		</div>
																	</div>
																	<div className="text-xs text-muted-foreground">
																		下一步: {formatStepLabel(item.nextStep)}
																		{formatStepStation(item.nextStep) !== "-" && (
																			<span> · {formatStepStation(item.nextStep)}</span>
																		)}
																	</div>
																</div>
															</TableCell>
															<TableCell>
																<Button
																	variant="secondary"
																	size="sm"
																	disabled={!canTrackIn || isInPending}
																	onClick={async () => {
																		if (!selectedStation || !selectedRunNo) return;
																		const woNo = queuedUnits?.workOrder.woNo || selectedWoNo;
																		if (!woNo) return;
																		await trackIn({
																			stationCode: selectedStation,
																			sn: item.sn,
																			runNo: selectedRunNo,
																			woNo,
																		});
																		refetchQueue();
																		refetchQueuedUnits();
																	}}
																>
																	进站
																</Button>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										)}
									</>
								)}
							</CardContent>
						</Card>
					</div>

					<Tabs defaultValue="in" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="in">扫码进站</TabsTrigger>
							<TabsTrigger value="out">扫码出站</TabsTrigger>
						</TabsList>
						<TabsContent value="in">
							<Card>
								<CardHeader>
									<CardTitle>快速进站</CardTitle>
									<CardDescription>扫描产品 SN 即可自动匹配工单与批次</CardDescription>
								</CardHeader>
								<CardContent>
									<form
										onSubmit={(e) => {
											e.preventDefault();
											e.stopPropagation();
											inForm.handleSubmit();
										}}
										className="space-y-4"
									>
										<Field form={inForm} name="sn" label="产品序列号 (SN)">
											{(field) => (
												<div className="space-y-2">
													<Input
														placeholder="请扫描 SN..."
														autoFocus
														className="text-lg font-mono"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => {
															const nextValue = e.target.value;
															const parsed = parseScanValue(nextValue);
															field.handleChange(nextValue);
															if (!parsed) {
																scheduleResolveFromSn(nextValue, "in");
																return;
															}
															if (parsed.sn) {
																inForm.setFieldValue("sn", parsed.sn);
															}
															if (parsed.woNo) {
																inForm.setFieldValue("woNo", parsed.woNo);
															}
															if (parsed.runNo) {
																inForm.setFieldValue("runNo", parsed.runNo);
															}
															if (parsed.sn && (!parsed.woNo || !parsed.runNo)) {
																scheduleResolveFromSn(parsed.sn, "in");
															}
														}}
													/>
													{isResolvingSn && (
														<div className="text-xs text-muted-foreground flex items-center gap-2">
															<RefreshCw className="h-3 w-3 animate-spin" />
															正在解析 SN 信息...
														</div>
													)}
													{resolveError && resolveError.sn === inSn && (
														<div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
															<p className="font-medium">
																{resolveError.code === "UNIT_NOT_FOUND"
																	? "未找到该 Unit"
																	: "自动补全解析失败"}
															</p>
															<p className="mt-1 opacity-90">{resolveError.message}</p>
															{showManualResolve && (
																<Button
																	variant="link"
																	size="sm"
																	className="h-auto p-0 text-xs text-destructive underline"
																	onClick={() => performResolve(inSn, "in")}
																>
																	重试解析
																</Button>
															)}
														</div>
													)}
												</div>
											)}
										</Field>
										{inSn.trim() && (
											<div className="text-xs text-muted-foreground">
												当前步骤:{" "}
												{inUnitHint ? formatStepDetail(inUnitHint.currentStep) : "未在待进站列表中"}
											</div>
										)}

										<div className="pt-2 border-t border-border mt-4">
											<p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 tracking-wider">
												手动补充（自动解析失败时填写）
											</p>
											<div className="grid grid-cols-2 gap-4">
												<Field form={inForm} name="woNo" label="工单号">
													{(field) =>
														canReadRun ? (
															<Combobox
																options={workOrderOptions}
																value={field.state.value}
																onValueChange={handleWorkOrderValueChange}
																placeholder="选择工单..."
																emptyText={isRunsFetching ? "加载中..." : "未找到工单"}
															/>
														) : (
															<Input
																placeholder="请输入工单号"
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) => field.handleChange(e.target.value)}
															/>
														)
													}
												</Field>
												<Field form={inForm} name="runNo" label="批次号 (Run)">
													{(field) =>
														canReadRun ? (
															<Combobox
																options={runOptions}
																value={field.state.value}
																onValueChange={handleRunValueChange}
																placeholder="选择批次..."
																emptyText={isRunsFetching ? "加载中..." : "未找到批次"}
															/>
														) : (
															<Input
																placeholder="请输入批次号"
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) => field.handleChange(e.target.value)}
															/>
														)
													}
												</Field>
											</div>
										</div>
										<Button
											type="submit"
											className="w-full h-12 text-base"
											disabled={isInPending || !canTrackIn}
										>
											{!canTrackIn ? "无进站权限" : isInPending ? "处理中..." : "确认进站"}
										</Button>
									</form>
								</CardContent>
							</Card>
						</TabsContent>
						<TabsContent value="out">
							<Card>
								<CardHeader>
									<CardTitle>快速出站</CardTitle>
									<CardDescription>从左侧队列点击"出站"按钮，或扫描 SN 手动出站</CardDescription>
								</CardHeader>
								<CardContent>
									<form
										onSubmit={(e) => {
											e.preventDefault();
											e.stopPropagation();
											outForm.handleSubmit();
										}}
										className="space-y-4"
									>
										<Field form={outForm} name="sn" label="产品序列号 (SN)">
											{(field) => (
												<div className="space-y-2">
													<Input
														placeholder="请扫描 SN..."
														className="text-lg font-mono"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => {
															const nextValue = e.target.value;
															field.handleChange(nextValue);
															const parsed = parseScanValue(nextValue);
															if (parsed?.sn) {
																outForm.setFieldValue("sn", parsed.sn);
															}
															if (parsed?.runNo) {
																outForm.setFieldValue("runNo", parsed.runNo);
															} else {
																scheduleResolveFromSn(parsed?.sn ?? nextValue, "out");
															}
														}}
													/>
													{isResolvingSn && (
														<div className="text-xs text-muted-foreground flex items-center gap-2">
															<RefreshCw className="h-3 w-3 animate-spin" />
															正在匹配批次信息...
														</div>
													)}
													{resolveError && resolveError.sn === outSn && (
														<div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
															<p className="font-medium">解析失败</p>
															<p className="mt-1 opacity-90">{resolveError.message}</p>
															{showManualResolve && (
																<Button
																	variant="link"
																	size="sm"
																	className="h-auto p-0 text-xs text-destructive underline"
																	onClick={() => performResolve(outSn, "out")}
																>
																	重试解析
																</Button>
															)}
														</div>
													)}
												</div>
											)}
										</Field>
										{outSn.trim() && (
											<div className="text-xs text-muted-foreground">
												当前步骤:{" "}
												{outUnitHint ? formatStepDetail(outUnitHint.currentStep) : "未在当前队列中"}
											</div>
										)}
										<div className="pt-2 border-t border-border mt-4">
											<p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 tracking-wider">
												手动补充（自动解析失败时填写）
											</p>
											<div className="grid grid-cols-[1fr_120px] gap-4 items-end">
												<Field form={outForm} name="runNo" label="批次号 (Run)">
													{(field) =>
														canReadRun ? (
															<Combobox
																options={runOptions}
																value={field.state.value}
																onValueChange={handleRunValueChange}
																placeholder="选择批次..."
																emptyText={isRunsFetching ? "加载中..." : "未找到批次"}
															/>
														) : (
															<Input
																placeholder="请输入批次号"
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) => field.handleChange(e.target.value)}
															/>
														)
													}
												</Field>
												<Field form={outForm} name="result" label="结果">
													{(field) => (
														<Select
															value={field.state.value}
															onValueChange={(value) => {
																if (value === "PASS" || value === "FAIL") {
																	field.handleChange(value);
																}
															}}
														>
															<SelectTrigger>
																<SelectValue placeholder="结果" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="PASS">合格</SelectItem>
																<SelectItem value="FAIL">不合格</SelectItem>
															</SelectContent>
														</Select>
													)}
												</Field>
											</div>
										</div>
										<Button
											type="submit"
											className="w-full h-12 text-base"
											disabled={isOutPending || !canTrackOut}
										>
											{!canTrackOut ? "无出站权限" : isOutPending ? "处理中..." : "确认出站"}
										</Button>
									</form>
								</CardContent>
							</Card>
						</TabsContent>{" "}
					</Tabs>
				</div>
			)}

			{/* TrackOut with Data Collection Dialog */}
			{trackOutItem && canTrackOut && (
				<TrackOutDialog
					open={trackOutDialogOpen}
					onOpenChange={setTrackOutDialogOpen}
					stationCode={selectedStation}
					sn={trackOutItem.sn}
					runNo={trackOutItem.runNo}
					initialResult={trackOutItem.initialResult}
					lockResult={trackOutItem.lockResult}
					onSuccess={handleTrackOutSuccess}
					canTrackOut={canTrackOut}
				/>
			)}
		</div>
	);
}
