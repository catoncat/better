import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardCheck,
	Loader2,
	Play,
	Plus,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
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
import {
	type DataCollectionSpec,
	useDataCollectionSpecList,
} from "@/hooks/use-data-collection-specs";
import {
	type FaiQuery,
	useCompleteFai,
	useFaiDetail,
	useFaiList,
	useRecordFaiItem,
	useStartFai,
} from "@/hooks/use-fai";
import { useAbility } from "@/hooks/use-ability";
import { useGenerateUnits, useRunDetail, useRunList } from "@/hooks/use-runs";
import { ApiError } from "@/lib/api-error";
import { FAI_STATUS_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const formatSpecDetail = (spec: DataCollectionSpec | null) => {
	if (!spec?.spec || typeof spec.spec !== "object") return "";
	const detail = spec.spec as Record<string, unknown>;
	const parts: string[] = [];
	if (typeof detail.min === "number") parts.push(`min ${detail.min}`);
	if (typeof detail.max === "number") parts.push(`max ${detail.max}`);
	if (typeof detail.target === "number") parts.push(`target ${detail.target}`);
	if (typeof detail.lsl === "number") parts.push(`LSL ${detail.lsl}`);
	if (typeof detail.usl === "number") parts.push(`USL ${detail.usl}`);
	if (typeof detail.unit === "string") parts.push(`单位 ${detail.unit}`);
	return parts.join(" / ");
};

const formatDataValue = (value: unknown) => {
	if (value === null || value === undefined) return "-";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};

interface FaiSearchParams {
	runNo?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/fai")({
	validateSearch: (search: Record<string, unknown>): FaiSearchParams => ({
		runNo: (search.runNo as string) || undefined,
		status: (search.status as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 20,
	}),
	component: FaiPage,
});

function FaiPage() {
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/fai" });
	const { hasPermission } = useAbility();
	const canViewFai = hasPermission(Permission.QUALITY_FAI);
	const canReadRun = hasPermission(Permission.RUN_READ);
	const canReadDataSpecs =
		hasPermission(Permission.DATA_SPEC_READ) && hasPermission(Permission.DATA_SPEC_CONFIG);
	const canGenerateUnits = hasPermission(Permission.RUN_AUTHORIZE);

	const query: FaiQuery = {
		runNo: searchParams.runNo,
		status: searchParams.status,
		page: searchParams.page || 1,
		pageSize: searchParams.pageSize || 20,
	};

	const [selectedFaiId, setSelectedFaiId] = useState<string | null>(null);
	const [recordDialogOpen, setRecordDialogOpen] = useState(false);
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [runSearch, setRunSearch] = useState("");
	const [runInput, setRunInput] = useState(query.runNo ?? "");
	const [specSearch, setSpecSearch] = useState("");
	const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);

	const { data, isLoading, refetch } = useFaiList(query, { enabled: canViewFai });
	const { data: faiDetail, isLoading: detailLoading } = useFaiDetail(selectedFaiId ?? undefined, {
		enabled: canViewFai,
	});
	const { data: runList, isLoading: isRunListLoading } = useRunList(
		{
			page: 1,
			pageSize: 20,
			search: runSearch,
		},
		{ enabled: canReadRun },
	);

	const startFai = useStartFai();
	const generateUnits = useGenerateUnits();
	const recordItem = useRecordFaiItem();
	const completeFai = useCompleteFai();

	useEffect(() => {
		setRunInput(query.runNo ?? "");
	}, [query.runNo]);

	const runOptions = useMemo(() => {
		const options =
			runList?.items.map((item) => ({
				value: item.runNo,
				label: [
					item.runNo,
					item.workOrder?.woNo ? `WO:${item.workOrder.woNo}` : null,
					item.line?.code ? `Line:${item.line.code}` : null,
				]
					.filter(Boolean)
					.join(" · "),
			})) ?? [];

		if (runInput && !options.some((option) => option.value === runInput)) {
			options.unshift({ value: runInput, label: runInput });
		}

		return options;
	}, [runList, runInput]);

	const updateSearch = (patch: Partial<FaiQuery>) => {
		const nextPage = patch.page ?? query.page ?? 1;
		const nextPageSize = patch.pageSize ?? query.pageSize ?? 20;
		const nextSearch: FaiSearchParams = {
			...searchParams,
			...patch,
			page: nextPage,
			pageSize: nextPageSize,
		};
		if (!nextSearch.runNo) delete nextSearch.runNo;
		if (!nextSearch.status) delete nextSearch.status;
		if (!nextSearch.page || nextSearch.page < 1) nextSearch.page = 1;
		if (!nextSearch.pageSize || nextSearch.pageSize <= 0) nextSearch.pageSize = 20;

		navigate({ to: ".", search: nextSearch, replace: true });
	};

	// Record item form state
	const [itemForm, setItemForm] = useState({
		unitSn: "",
		itemName: "",
		itemSpec: "",
		actualValue: "",
		result: "PASS" as "PASS" | "FAIL" | "NA",
		remark: "",
	});

	// Complete form state
	const [completeForm, setCompleteForm] = useState({
		decision: "PASS" as "PASS" | "FAIL",
		failedQty: 1,
		remark: "",
	});

	// Cast to include run relation which is included by the API but not in the base type
	type FaiItemWithRun = NonNullable<typeof data>["items"][number] & {
		run?: { runNo: string } | null;
	};
	type FaiTrialSummary = {
		units: Array<{
			sn: string;
			trackOuts: Array<{
				stepNo: number;
				stationCode: string | null;
				outAt: string | null;
				result: string | null;
				dataValues: Array<{
					name: string;
					value: unknown;
					judge: string | null;
					collectedAt: string;
				}>;
			}>;
			inspections: Array<{
				inspectionType: string;
				result: string;
				stationCode: string;
				stepNo: number;
				eventTime: string;
			}>;
		}>;
	};
	const items = (data?.items ?? []) as FaiItemWithRun[];
	const selectedFai = items.find((fai) => fai.id === selectedFaiId);
	const selectedRunNo = selectedFai?.run?.runNo ?? "";
	const { data: runDetail } = useRunDetail(selectedRunNo, { enabled: canReadRun });
	const firstStep = runDetail?.routeSteps?.[0] ?? null;
	const { data: specList, isLoading: specLoading } = useDataCollectionSpecList(
		{
			operationCode: firstStep?.operationCode,
			isActive: "true",
			pageSize: 50,
		},
		{ enabled: canReadDataSpecs && Boolean(firstStep?.operationCode) },
	);
	const availableSpecs = specList?.items ?? [];
	const selectedSpec = availableSpecs.find((spec) => spec.id === selectedSpecId) ?? null;
	const sampleQty = faiDetail?.sampleQty ?? selectedFai?.sampleQty ?? null;
	const total = data?.total ?? 0;
	const currentPage = query.page ?? 1;
	const pageSize = query.pageSize ?? 20;
	const totalPages = Math.ceil(total / pageSize);
	const computedPassedQty =
		typeof sampleQty === "number" ? Math.max(sampleQty - completeForm.failedQty, 0) : null;
	const isFailDecision = completeForm.decision === "FAIL";
	const isFailedQtyInvalid =
		isFailDecision &&
		(completeForm.failedQty <= 0 ||
			(typeof sampleQty === "number" && completeForm.failedQty > sampleQty));
	const trialSummary = useMemo(
		() => (faiDetail as { trialSummary?: FaiTrialSummary | null } | null)?.trialSummary ?? null,
		[faiDetail],
	);
	const trialUnits = trialSummary?.units ?? [];
	const trackValueRows = useMemo(
		() =>
			trialUnits.flatMap((unit) =>
				unit.trackOuts.flatMap((track) =>
					track.dataValues.map((value) => ({
						sn: unit.sn,
						stepNo: track.stepNo,
						stationCode: track.stationCode,
						name: value.name,
						value: value.value,
						judge: value.judge,
						collectedAt: value.collectedAt,
					})),
				),
			),
		[trialUnits],
	);
	const inspectionRows = useMemo(
		() =>
			trialUnits.flatMap((unit) =>
				unit.inspections.map((record) => ({
					sn: unit.sn,
					stepNo: record.stepNo,
					stationCode: record.stationCode,
					inspectionType: record.inspectionType,
					result: record.result,
					eventTime: record.eventTime,
				})),
			),
		[trialUnits],
	);

	useEffect(() => {
		if (!selectedSpec) return;
		setItemForm((current) => ({
			...current,
			itemName: selectedSpec.name,
			itemSpec: formatSpecDetail(selectedSpec),
		}));
	}, [selectedSpec]);

	useEffect(() => {
		if (!recordDialogOpen) {
			setSelectedSpecId(null);
			setSpecSearch("");
		}
	}, [recordDialogOpen]);

	const getStatusBadge = (status: string) => {
		const label = FAI_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "INSPECTING") variant = "default";
		if (status === "PASS") variant = "secondary";
		if (status === "FAIL") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const handleStartFai = async (fai: FaiItemWithRun) => {
		try {
			await startFai.mutateAsync(fai.id);
			refetch();
		} catch (error: unknown) {
			if (error instanceof ApiError && error.code === "FAI_UNITS_REQUIRED") {
				const runNo = fai.run?.runNo ?? "";
				if (!runNo) {
					toast.error("开始 FAI 检验失败", { description: "无法获取批次号" });
					return;
				}
				if (!canGenerateUnits) {
					toast.error("无法生成单件", { description: "缺少批次授权权限" });
					return;
				}
				const quantity = fai.sampleQty && fai.sampleQty > 0 ? fai.sampleQty : 1;
				if (!confirm(`当前批次暂无单件，是否生成 ${quantity} 个单件？`)) {
					return;
				}
				try {
					await generateUnits.mutateAsync({ runNo, quantity });
					await startFai.mutateAsync(fai.id);
					refetch();
				} catch {
					return;
				}
				return;
			}

			if (error instanceof ApiError) {
				toast.error("开始 FAI 检验失败", {
					description: error.message
						? `${error.message}${error.code ? `（${error.code}）` : ""}`
						: error.code,
				});
				return;
			}

			toast.error("开始 FAI 检验失败", { description: "请重试或联系管理员" });
		}
	};

	const handleRecordItem = () => {
		if (!selectedFaiId || !itemForm.itemName) return;
		recordItem.mutate(
			{
				faiId: selectedFaiId,
				data: {
					unitSn: itemForm.unitSn || undefined,
					itemName: itemForm.itemName,
					itemSpec: itemForm.itemSpec || undefined,
					actualValue: itemForm.actualValue || undefined,
					result: itemForm.result,
					remark: itemForm.remark || undefined,
				},
			},
			{
				onSuccess: () => {
					setRecordDialogOpen(false);
					setSelectedSpecId(null);
					setSpecSearch("");
					setItemForm({
						unitSn: "",
						itemName: "",
						itemSpec: "",
						actualValue: "",
						result: "PASS",
						remark: "",
					});
					refetch();
				},
			},
		);
	};

	const handleCompleteFai = () => {
		if (!selectedFaiId) return;
		if (isFailedQtyInvalid) return;
		completeFai.mutate(
			{
				faiId: selectedFaiId,
				decision: completeForm.decision,
				failedQty: isFailDecision ? completeForm.failedQty : undefined,
				passedQty:
					isFailDecision && typeof sampleQty === "number" ? (computedPassedQty ?? 0) : undefined,
				remark: completeForm.remark || undefined,
			},
			{
				onSuccess: () => {
					setCompleteDialogOpen(false);
					setSelectedFaiId(null);
					setCompleteForm({ decision: "PASS", failedQty: 1, remark: "" });
					refetch();
				},
			},
		);
	};

	const header = (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold">FAI 首件检验</h1>
				<p className="text-muted-foreground">首件检验任务管理</p>
			</div>
		</div>
	);

	if (!canViewFai) {
		return (
			<div className="container mx-auto py-6 space-y-6">
				{header}
				<NoAccessCard description="需要首件检验权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			{header}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">FAI 试产说明</CardTitle>
					<CardDescription>首件试产仅在第一工序进行</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
						<li>需完成指定数量的 Unit TrackIn/TrackOut</li>
						<li>试产完成后回到此页记录检验项并完成判定</li>
					</ul>
				</CardContent>
			</Card>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">筛选条件</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 flex-wrap">
						{canReadRun && (
							<div className="w-48">
								<Label>Run 编号</Label>
								<Combobox
									options={runOptions}
									value={runInput}
									onValueChange={(value) => {
										setRunInput(value);
										updateSearch({ runNo: value || undefined, page: 1 });
									}}
									placeholder="选择批次..."
									searchPlaceholder="搜索批次或工单号"
									emptyText={isRunListLoading ? "加载中..." : "未找到批次"}
									searchValue={runSearch}
									onSearchValueChange={setRunSearch}
								/>
							</div>
						)}
						<div className="w-40">
							<Label>状态</Label>
							<Select
								value={query.status ?? "ALL"}
								onValueChange={(v) =>
									updateSearch({ status: v === "ALL" ? undefined : v, page: 1 })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">全部</SelectItem>
									{Object.entries(FAI_STATUS_MAP).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* FAI List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<ClipboardCheck className="h-5 w-5" />
						FAI 任务列表
					</CardTitle>
					<CardDescription>共 {total} 条记录</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : items.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">暂无 FAI 任务</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Run 编号</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>抽样数</TableHead>
									<TableHead>通过/失败</TableHead>
									<TableHead>创建时间</TableHead>
									<TableHead>开始时间</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((fai) => (
									<TableRow key={fai.id}>
										<TableCell>
											{canReadRun && fai.run?.runNo ? (
												<Link
													to="/mes/runs/$runNo"
													params={{ runNo: fai.run.runNo }}
													className="text-primary underline-offset-4 hover:underline"
												>
													{fai.run.runNo}
												</Link>
											) : (
												<span className="text-muted-foreground">{fai.run?.runNo ?? "-"}</span>
											)}
										</TableCell>
										<TableCell>{getStatusBadge(fai.status)}</TableCell>
										<TableCell>{fai.sampleQty ?? "-"}</TableCell>
										<TableCell>
											{fai.passedQty ?? 0} / {fai.failedQty ?? 0}
										</TableCell>
										<TableCell>{formatDateTime(fai.createdAt)}</TableCell>
										<TableCell>{formatDateTime(fai.startedAt)}</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-2 justify-end">
												{fai.status === "PENDING" && (
													<Can permissions={Permission.QUALITY_FAI}>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleStartFai(fai)}
															disabled={startFai.isPending || generateUnits.isPending}
														>
															<Play className="h-4 w-4 mr-1" />
															开始
														</Button>
													</Can>
												)}
												{fai.status === "INSPECTING" && (
													<>
														<Can permissions={Permission.QUALITY_FAI}>
															<Button
																size="sm"
																variant="outline"
																onClick={() => {
																	setSelectedFaiId(fai.id);
																	setRecordDialogOpen(true);
																}}
															>
																<Plus className="h-4 w-4 mr-1" />
																记录
															</Button>
														</Can>
														<Can permissions={Permission.QUALITY_FAI}>
															<Button
																size="sm"
																onClick={() => {
																	setSelectedFaiId(fai.id);
																	setCompleteDialogOpen(true);
																}}
															>
																<CheckCircle2 className="h-4 w-4 mr-1" />
																完成
															</Button>
														</Can>
													</>
												)}
												{(fai.status === "PASS" || fai.status === "FAIL") && (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => setSelectedFaiId(fai.id)}
													>
														查看详情
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<div className="text-sm text-muted-foreground">
								第 {currentPage} / {totalPages} 页
							</div>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={currentPage <= 1}
									onClick={() => updateSearch({ page: currentPage - 1 })}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={currentPage >= totalPages}
									onClick={() => updateSearch({ page: currentPage + 1 })}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* FAI Detail Card */}
			{selectedFaiId && faiDetail && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">FAI 详情</CardTitle>
							<Button size="sm" variant="ghost" onClick={() => setSelectedFaiId(null)}>
								<XCircle className="h-4 w-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{detailLoading ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="h-5 w-5 animate-spin" />
							</div>
						) : (
							<div className="space-y-4">
								<div className="grid grid-cols-4 gap-4 text-sm">
									<div>
										<span className="text-muted-foreground">状态：</span>
										{getStatusBadge(faiDetail.status)}
									</div>
									<div>
										<span className="text-muted-foreground">抽样数：</span>
										{faiDetail.sampleQty ?? "-"}
									</div>
									<div>
										<span className="text-muted-foreground">通过：</span>
										{faiDetail.passedQty ?? 0}
									</div>
									<div>
										<span className="text-muted-foreground">失败：</span>
										{faiDetail.failedQty ?? 0}
									</div>
								</div>

								{faiDetail.items && faiDetail.items.length > 0 && (
									<div>
										<h4 className="font-medium mb-2">检验记录</h4>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>检验项</TableHead>
													<TableHead>规格</TableHead>
													<TableHead>实测值</TableHead>
													<TableHead>结果</TableHead>
													<TableHead>SN</TableHead>
													<TableHead>时间</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{faiDetail.items.map((item) => (
													<TableRow key={item.id}>
														<TableCell>{item.itemName}</TableCell>
														<TableCell>{item.itemSpec ?? "-"}</TableCell>
														<TableCell>{item.actualValue ?? "-"}</TableCell>
														<TableCell>
															<Badge variant={item.result === "PASS" ? "secondary" : "destructive"}>
																{item.result === "PASS"
																	? "通过"
																	: item.result === "FAIL"
																		? "不通过"
																		: "N/A"}
															</Badge>
														</TableCell>
														<TableCell>{item.unitSn ?? "-"}</TableCell>
														<TableCell>{formatDateTime(item.inspectedAt)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
								{trialSummary && (
									<div className="space-y-4">
										<div>
											<h4 className="font-medium mb-2">试产单位</h4>
											{trialUnits.length > 0 ? (
												<div className="flex flex-wrap gap-2">
													{trialUnits.map((unit) => (
														<Badge key={unit.sn} variant="outline">
															{unit.sn}
														</Badge>
													))}
												</div>
											) : (
												<p className="text-sm text-muted-foreground">暂无试产记录</p>
											)}
										</div>
										<div>
											<h4 className="font-medium mb-2">TrackOut 采集结果</h4>
											{trackValueRows.length > 0 ? (
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>SN</TableHead>
															<TableHead>步骤</TableHead>
															<TableHead>工位</TableHead>
															<TableHead>采集项</TableHead>
															<TableHead>值</TableHead>
															<TableHead>判定</TableHead>
															<TableHead>时间</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{trackValueRows.map((row, index) => (
															<TableRow key={`${row.sn}-${row.name}-${index}`}>
																<TableCell>{row.sn}</TableCell>
																<TableCell>Step {row.stepNo}</TableCell>
																<TableCell>{row.stationCode ?? "-"}</TableCell>
																<TableCell>{row.name}</TableCell>
																<TableCell>{formatDataValue(row.value)}</TableCell>
																<TableCell>
																	{row.judge ? (
																		<Badge
																			variant={row.judge === "PASS" ? "secondary" : "destructive"}
																		>
																			{row.judge}
																		</Badge>
																	) : (
																		"-"
																	)}
																</TableCell>
																<TableCell>{formatDateTime(row.collectedAt)}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											) : (
												<p className="text-sm text-muted-foreground">暂无 TrackOut 采集数据</p>
											)}
										</div>
										<div>
											<h4 className="font-medium mb-2">SPI/AOI 检验记录</h4>
											{inspectionRows.length > 0 ? (
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>SN</TableHead>
															<TableHead>步骤</TableHead>
															<TableHead>工位</TableHead>
															<TableHead>类型</TableHead>
															<TableHead>结果</TableHead>
															<TableHead>时间</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{inspectionRows.map((row, index) => (
															<TableRow key={`${row.sn}-${row.inspectionType}-${index}`}>
																<TableCell>{row.sn}</TableCell>
																<TableCell>Step {row.stepNo}</TableCell>
																<TableCell>{row.stationCode ?? "-"}</TableCell>
																<TableCell>{row.inspectionType}</TableCell>
																<TableCell>
																	<Badge
																		variant={row.result === "PASS" ? "secondary" : "destructive"}
																	>
																		{row.result}
																	</Badge>
																</TableCell>
																<TableCell>{formatDateTime(row.eventTime)}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											) : (
												<p className="text-sm text-muted-foreground">暂无 SPI/AOI 记录</p>
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Record Item Dialog */}
			<Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>记录检验项</DialogTitle>
						<DialogDescription>录入 FAI 检验结果</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>检验项模板（采集项）</Label>
							{canReadDataSpecs ? (
								<>
									<Combobox
										options={availableSpecs.map((spec) => ({
											value: spec.id,
											label: `${spec.name} · ${spec.operationCode}`,
										}))}
										value={selectedSpecId ?? ""}
										onValueChange={(value) => {
											setSelectedSpecId(value || null);
											if (!value) {
												setItemForm((current) => ({ ...current, itemName: "", itemSpec: "" }));
											}
										}}
										placeholder={specLoading ? "加载中..." : "选择采集项模板"}
										searchPlaceholder="搜索检验项"
										emptyText={specLoading ? "加载中..." : "暂无可用采集项"}
										searchValue={specSearch}
										onSearchValueChange={setSpecSearch}
									/>
									{firstStep && (
										<p className="text-xs text-muted-foreground mt-1">
											默认展示首工序 {firstStep.operationCode} 的采集项
										</p>
									)}
								</>
							) : (
								<p className="text-sm text-muted-foreground">需要采集项权限才能选择模板</p>
							)}
						</div>
						<div>
							<Label>检验项名称 *</Label>
							<Input
								value={itemForm.itemName}
								onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
								disabled={Boolean(selectedSpec)}
								placeholder="如：尺寸检验"
							/>
						</div>
						<div>
							<Label>规格要求</Label>
							<Input
								value={itemForm.itemSpec}
								onChange={(e) => setItemForm({ ...itemForm, itemSpec: e.target.value })}
								disabled={Boolean(selectedSpec)}
								placeholder="如：10±0.5mm"
							/>
						</div>
						<div>
							<Label>实测值</Label>
							{selectedSpec?.dataType === "BOOLEAN" ? (
								<Select
									value={itemForm.actualValue}
									onValueChange={(v) => setItemForm({ ...itemForm, actualValue: v })}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择值" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">true</SelectItem>
										<SelectItem value="false">false</SelectItem>
									</SelectContent>
								</Select>
							) : selectedSpec?.dataType === "JSON" ? (
								<Textarea
									value={itemForm.actualValue}
									onChange={(e) => setItemForm({ ...itemForm, actualValue: e.target.value })}
									placeholder='如：{"key":"value"}'
								/>
							) : (
								<Input
									type={selectedSpec?.dataType === "NUMBER" ? "number" : "text"}
									value={itemForm.actualValue}
									onChange={(e) => setItemForm({ ...itemForm, actualValue: e.target.value })}
									placeholder="如：10.2mm"
								/>
							)}
						</div>
						<div>
							<Label>结果</Label>
							<Select
								value={itemForm.result}
								onValueChange={(v) =>
									setItemForm({ ...itemForm, result: v as "PASS" | "FAIL" | "NA" })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="PASS">通过</SelectItem>
									<SelectItem value="FAIL">不通过</SelectItem>
									<SelectItem value="NA">N/A</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>单位 SN（可选）</Label>
							<Input
								value={itemForm.unitSn}
								onChange={(e) => setItemForm({ ...itemForm, unitSn: e.target.value })}
								placeholder="被检单位序列号"
							/>
						</div>
						<div>
							<Label>备注</Label>
							<Textarea
								value={itemForm.remark}
								onChange={(e) => setItemForm({ ...itemForm, remark: e.target.value })}
								placeholder="备注信息"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRecordDialogOpen(false)}>
							取消
						</Button>
						<Button
							onClick={handleRecordItem}
							disabled={!itemForm.itemName || recordItem.isPending}
						>
							{recordItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Complete FAI Dialog */}
			<Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>完成 FAI 检验</DialogTitle>
						<DialogDescription>确认检验结论</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>检验结论 *</Label>
							<Select
								value={completeForm.decision}
								onValueChange={(v) =>
									setCompleteForm({
										...completeForm,
										decision: v as "PASS" | "FAIL",
										failedQty: completeForm.failedQty > 0 ? completeForm.failedQty : 1,
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="PASS">通过</SelectItem>
									<SelectItem value="FAIL">失败</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{isFailDecision && (
							<div>
								<Label>失败数量 *</Label>
								<Input
									type="number"
									min={1}
									max={typeof sampleQty === "number" ? sampleQty : undefined}
									value={completeForm.failedQty}
									onChange={(e) => {
										const value = Number.parseInt(e.target.value, 10);
										setCompleteForm({
											...completeForm,
											failedQty: Number.isNaN(value) ? 0 : value,
										});
									}}
								/>
								<div className="text-xs text-muted-foreground mt-1">
									通过数量：{computedPassedQty ?? "-"} / 抽样数 {sampleQty ?? "-"}
								</div>
							</div>
						)}
						<div>
							<Label>备注</Label>
							<Textarea
								value={completeForm.remark}
								onChange={(e) => setCompleteForm({ ...completeForm, remark: e.target.value })}
								placeholder="检验结论备注"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
							取消
						</Button>
						<Button
							onClick={handleCompleteFai}
							disabled={completeFai.isPending || isFailedQtyInvalid}
						>
							{completeFai.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							确认完成
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
