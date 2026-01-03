import { Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	AlertTriangle,
	ChevronLeft,
	ChevronRight,
	Loader2,
	PackageX,
	RotateCcw,
	Shield,
	Trash2,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
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
	type DefectQuery,
	useAssignDisposition,
	useDefectDetail,
	useDefectList,
	useReleaseHold,
} from "@/hooks/use-defects";
import { useUnitTrace } from "@/hooks/use-trace";

export const Route = createFileRoute("/_authenticated/mes/defects")({
	component: DefectsPage,
});

function DefectsPage() {
	const [query, setQuery] = useState<DefectQuery>({
		page: 1,
		pageSize: 20,
	});

	const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
	const [dispositionDialogOpen, setDispositionDialogOpen] = useState(false);
	const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

	const { data, isLoading, refetch } = useDefectList(query);
	const { data: defectDetail, isLoading: detailLoading } = useDefectDetail(
		selectedDefectId ?? undefined,
	);

	const assignDisposition = useAssignDisposition();
	const releaseHold = useReleaseHold();
	const { hasPermission } = useAbility();
	const canTraceRead = hasPermission(Permission.TRACE_READ);

	// Disposition form state
	const [dispositionForm, setDispositionForm] = useState({
		type: "REWORK" as "REWORK" | "SCRAP" | "HOLD",
		reason: "",
		toStepNo: 1,
	});

	// Release form state
	const [releaseReason, setReleaseReason] = useState("");

	// Cast to include unit relation
	type DefectWithUnit = NonNullable<typeof data>["items"][number] & {
		unit?: { sn: string; runId?: string } | null;
	};
	const items = (data?.items ?? []) as DefectWithUnit[];
	const total = data?.total ?? 0;
	const currentPage = data?.page ?? 1;
	const pageSize = data?.pageSize ?? 20;
	const totalPages = Math.ceil(total / pageSize);

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
			RECORDED: { label: "已记录", variant: "destructive" },
			DISPOSITIONED: { label: "已处置", variant: "default" },
			CLOSED: { label: "已关闭", variant: "secondary" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getDispositionBadge = (type?: string | null) => {
		if (!type) return null;
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			REWORK: { label: "返工", variant: "default" },
			SCRAP: { label: "报废", variant: "destructive" },
			HOLD: { label: "暂扣", variant: "outline" },
		};
		const config = map[type] ?? { label: type, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const handleAssignDisposition = () => {
		if (!selectedDefectId) return;
		assignDisposition.mutate(
			{
				defectId: selectedDefectId,
				data: {
					type: dispositionForm.type,
					reason: dispositionForm.reason || undefined,
					toStepNo: dispositionForm.type === "REWORK" ? dispositionForm.toStepNo : undefined,
				},
			},
			{
				onSuccess: () => {
					setDispositionDialogOpen(false);
					setDispositionForm({ type: "REWORK", reason: "", toStepNo: 1 });
					refetch();
				},
			},
		);
	};

	const handleReleaseHold = () => {
		if (!selectedDefectId || !releaseReason) return;
		releaseHold.mutate(
			{
				defectId: selectedDefectId,
				reason: releaseReason,
			},
			{
				onSuccess: () => {
					setReleaseDialogOpen(false);
					setReleaseReason("");
					setSelectedDefectId(null);
					refetch();
				},
			},
		);
	};

	// Type for detail with disposition
	type DispositionDetail = {
		type?: string | null;
		reason?: string | null;
		decidedAt?: string | Date | null;
		reworkTask?: {
			status?: string | null;
			toStepNo?: number | null;
		} | null;
	};
	const defectDetailTyped = defectDetail as
		| (NonNullable<typeof defectDetail> & { disposition?: DispositionDetail | null })
		| null;

	const selectedUnitSn = useMemo(() => {
		const fromDetail = (defectDetailTyped as { unit?: { sn?: string } | null } | null)?.unit?.sn;
		if (fromDetail) return fromDetail;
		const fromList = items.find((item) => item.id === selectedDefectId)?.unit?.sn;
		return fromList ?? "";
	}, [defectDetailTyped, items, selectedDefectId]);

	const traceSn =
		canTraceRead && dispositionDialogOpen && dispositionForm.type === "REWORK"
			? selectedUnitSn
			: "";
	const { data: traceData, isLoading: isTraceLoading } = useUnitTrace(traceSn, "latest");

	const reworkStepOptions = useMemo(() => {
		const steps = traceData?.steps ?? [];
		return [...steps]
			.sort((a, b) => a.stepNo - b.stepNo)
			.map((step) => ({
				value: String(step.stepNo),
				label: `Step ${step.stepNo} · ${step.stationType}`,
			}));
	}, [traceData?.steps]);

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">缺陷管理</h1>
					<p className="text-muted-foreground">缺陷记录与处置管理</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">筛选条件</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 flex-wrap">
						<div className="w-48">
							<Label>单位 SN</Label>
							<Input
								placeholder="输入单位 SN"
								value={query.unitSn ?? ""}
								onChange={(e) =>
									setQuery({ ...query, unitSn: e.target.value || undefined, page: 1 })
								}
							/>
						</div>
						<div className="w-48">
							<Label>缺陷代码</Label>
							<Input
								placeholder="输入缺陷代码"
								value={query.code ?? ""}
								onChange={(e) => setQuery({ ...query, code: e.target.value || undefined, page: 1 })}
							/>
						</div>
						<div className="w-40">
							<Label>状态</Label>
							<Select
								value={query.status ?? "ALL"}
								onValueChange={(v) =>
									setQuery({ ...query, status: v === "ALL" ? undefined : v, page: 1 })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">全部</SelectItem>
									<SelectItem value="RECORDED">已记录</SelectItem>
									<SelectItem value="DISPOSITIONED">已处置</SelectItem>
									<SelectItem value="CLOSED">已关闭</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Defect List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<AlertTriangle className="h-5 w-5" />
						缺陷列表
					</CardTitle>
					<CardDescription>共 {total} 条记录</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : items.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">暂无缺陷记录</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>单位 SN</TableHead>
									<TableHead>缺陷代码</TableHead>
									<TableHead>位置</TableHead>
									<TableHead>数量</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>处置</TableHead>
									<TableHead>创建时间</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((defect) => (
									<TableRow key={defect.id}>
										<TableCell className="font-mono text-sm">{defect.unit?.sn ?? "-"}</TableCell>
										<TableCell>{defect.code}</TableCell>
										<TableCell>{defect.location ?? "-"}</TableCell>
										<TableCell>{defect.qty ?? 1}</TableCell>
										<TableCell>{getStatusBadge(defect.status)}</TableCell>
										<TableCell>
											{(defect as { disposition?: { type?: string } | null }).disposition?.type
												? getDispositionBadge(
														(defect as { disposition?: { type?: string } | null }).disposition
															?.type,
													)
												: "-"}
										</TableCell>
										<TableCell>{formatTime(defect.createdAt)}</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-2 justify-end">
												{defect.status === "RECORDED" && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															setSelectedDefectId(defect.id);
															setDispositionDialogOpen(true);
														}}
													>
														<Shield className="h-4 w-4 mr-1" />
														处置
													</Button>
												)}
												{defect.status === "DISPOSITIONED" &&
													(defect as { disposition?: { type?: string } | null }).disposition
														?.type === "HOLD" && (
														<Button
															size="sm"
															variant="outline"
															onClick={() => {
																setSelectedDefectId(defect.id);
																setReleaseDialogOpen(true);
															}}
														>
															<PackageX className="h-4 w-4 mr-1" />
															释放
														</Button>
													)}
												<Button
													size="sm"
													variant="ghost"
													onClick={() => setSelectedDefectId(defect.id)}
												>
													查看详情
												</Button>
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
									onClick={() => setQuery({ ...query, page: currentPage - 1 })}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={currentPage >= totalPages}
									onClick={() => setQuery({ ...query, page: currentPage + 1 })}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Defect Detail Card */}
			{selectedDefectId && defectDetailTyped && !dispositionDialogOpen && !releaseDialogOpen && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">缺陷详情</CardTitle>
							<Button size="sm" variant="ghost" onClick={() => setSelectedDefectId(null)}>
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
										{getStatusBadge(defectDetailTyped.status)}
									</div>
									<div>
										<span className="text-muted-foreground">缺陷代码：</span>
										{defectDetailTyped.code}
									</div>
									<div>
										<span className="text-muted-foreground">位置：</span>
										{defectDetailTyped.location ?? "-"}
									</div>
									<div>
										<span className="text-muted-foreground">数量：</span>
										{defectDetailTyped.qty ?? 1}
									</div>
								</div>

								{defectDetailTyped.disposition && (
									<div className="border-t pt-4 space-y-2">
										<h4 className="font-medium">处置信息</h4>
										<div className="grid grid-cols-4 gap-4 text-sm">
											<div>
												<span className="text-muted-foreground">类型：</span>
												{getDispositionBadge(defectDetailTyped.disposition.type)}
											</div>
											<div>
												<span className="text-muted-foreground">原因：</span>
												{defectDetailTyped.disposition.reason ?? "-"}
											</div>
											<div>
												<span className="text-muted-foreground">决定时间：</span>
												{formatTime(defectDetailTyped.disposition.decidedAt)}
											</div>
											{defectDetailTyped.disposition.type === "REWORK" &&
												defectDetailTyped.disposition.reworkTask && (
													<div>
														<span className="text-muted-foreground">返工状态：</span>
														<Badge
															variant={
																defectDetailTyped.disposition.reworkTask.status === "DONE"
																	? "secondary"
																	: "default"
															}
														>
															{defectDetailTyped.disposition.reworkTask.status === "OPEN"
																? "进行中"
																: defectDetailTyped.disposition.reworkTask.status === "DONE"
																	? "已完成"
																	: defectDetailTyped.disposition.reworkTask.status}
														</Badge>
													</div>
												)}
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Disposition Dialog */}
			<Dialog open={dispositionDialogOpen} onOpenChange={setDispositionDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>分配处置</DialogTitle>
						<DialogDescription>为缺陷选择处置方式</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>处置类型 *</Label>
							<Select
								value={dispositionForm.type}
								onValueChange={(v) =>
									setDispositionForm({
										...dispositionForm,
										type: v as "REWORK" | "SCRAP" | "HOLD",
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="REWORK">
										<div className="flex items-center gap-2">
											<RotateCcw className="h-4 w-4" />
											返工
										</div>
									</SelectItem>
									<SelectItem value="SCRAP">
										<div className="flex items-center gap-2">
											<Trash2 className="h-4 w-4" />
											报废
										</div>
									</SelectItem>
									<SelectItem value="HOLD">
										<div className="flex items-center gap-2">
											<Shield className="h-4 w-4" />
											暂扣
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{dispositionForm.type === "REWORK" && (
							<div>
								<Label>返工至工步</Label>
								{reworkStepOptions.length > 0 ? (
									<Select
										value={String(dispositionForm.toStepNo)}
										onValueChange={(value) =>
											setDispositionForm({
												...dispositionForm,
												toStepNo: Number.parseInt(value, 10) || 1,
											})
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="选择工步" />
										</SelectTrigger>
										<SelectContent>
											{reworkStepOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<Input
										type="number"
										min={1}
										value={dispositionForm.toStepNo}
										onChange={(e) =>
											setDispositionForm({
												...dispositionForm,
												toStepNo: Number.parseInt(e.target.value, 10) || 1,
											})
										}
									/>
								)}
								<div className="mt-1 text-xs text-muted-foreground">
									{isTraceLoading
										? "正在加载路由工步..."
										: reworkStepOptions.length > 0
											? "基于当前路由选择返工目标工步"
											: "未获取到路由工步，可手动输入工步编号"}
								</div>
							</div>
						)}
						<div>
							<Label>原因</Label>
							<Textarea
								value={dispositionForm.reason}
								onChange={(e) => setDispositionForm({ ...dispositionForm, reason: e.target.value })}
								placeholder="处置原因说明"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDispositionDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleAssignDisposition} disabled={assignDisposition.isPending}>
							{assignDisposition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							确认
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Release Hold Dialog */}
			<Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>释放 HOLD</DialogTitle>
						<DialogDescription>释放暂扣的单位</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>释放原因 *</Label>
							<Textarea
								value={releaseReason}
								onChange={(e) => setReleaseReason(e.target.value)}
								placeholder="填写释放原因"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleReleaseHold} disabled={!releaseReason || releaseHold.isPending}>
							{releaseHold.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							确认释放
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
