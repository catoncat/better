import { Permission } from "@better-app/db/permissions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
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
	type FaiQuery,
	useCompleteFai,
	useFaiDetail,
	useFaiList,
	useRecordFaiItem,
	useStartFai,
} from "@/hooks/use-fai";

export const Route = createFileRoute("/_authenticated/mes/fai")({
	component: FaiPage,
});

function FaiPage() {
	const [query, setQuery] = useState<FaiQuery>({
		page: 1,
		pageSize: 20,
	});

	const [selectedFaiId, setSelectedFaiId] = useState<string | null>(null);
	const [recordDialogOpen, setRecordDialogOpen] = useState(false);
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

	const { data, isLoading, refetch } = useFaiList(query);
	const { data: faiDetail, isLoading: detailLoading } = useFaiDetail(selectedFaiId ?? undefined);

	const startFai = useStartFai();
	const recordItem = useRecordFaiItem();
	const completeFai = useCompleteFai();

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
	const items = (data?.items ?? []) as FaiItemWithRun[];
	const selectedFai = items.find((fai) => fai.id === selectedFaiId);
	const sampleQty = faiDetail?.sampleQty ?? selectedFai?.sampleQty ?? null;
	const total = data?.total ?? 0;
	const currentPage = data?.page ?? 1;
	const pageSize = data?.pageSize ?? 20;
	const totalPages = Math.ceil(total / pageSize);
	const computedPassedQty =
		typeof sampleQty === "number" ? Math.max(sampleQty - completeForm.failedQty, 0) : null;
	const isFailDecision = completeForm.decision === "FAIL";
	const isFailedQtyInvalid =
		isFailDecision &&
		(completeForm.failedQty <= 0 ||
			(typeof sampleQty === "number" && completeForm.failedQty > sampleQty));

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
			PENDING: { label: "待开始", variant: "outline" },
			INSPECTING: { label: "检验中", variant: "default" },
			PASS: { label: "通过", variant: "secondary" },
			FAIL: { label: "失败", variant: "destructive" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const handleStartFai = (faiId: string) => {
		startFai.mutate(faiId, {
			onSuccess: () => {
				refetch();
			},
		});
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

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">FAI 首件检验</h1>
					<p className="text-muted-foreground">首件检验任务管理</p>
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
							<Label>Run 编号</Label>
							<Input
								placeholder="输入 Run 编号"
								value={query.runNo ?? ""}
								onChange={(e) =>
									setQuery({ ...query, runNo: e.target.value || undefined, page: 1 })
								}
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
									<SelectItem value="PENDING">待开始</SelectItem>
									<SelectItem value="INSPECTING">检验中</SelectItem>
									<SelectItem value="PASS">已通过</SelectItem>
									<SelectItem value="FAIL">已失败</SelectItem>
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
											<Link
												to="/mes/runs/$runNo"
												params={{ runNo: fai.run?.runNo ?? "" }}
												className="text-primary underline-offset-4 hover:underline"
											>
												{fai.run?.runNo ?? "-"}
											</Link>
										</TableCell>
										<TableCell>{getStatusBadge(fai.status)}</TableCell>
										<TableCell>{fai.sampleQty ?? "-"}</TableCell>
										<TableCell>
											{fai.passedQty ?? 0} / {fai.failedQty ?? 0}
										</TableCell>
										<TableCell>{formatTime(fai.createdAt)}</TableCell>
										<TableCell>{formatTime(fai.startedAt)}</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-2 justify-end">
												{fai.status === "PENDING" && (
													<Can permissions={Permission.QUALITY_FAI}>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleStartFai(fai.id)}
															disabled={startFai.isPending}
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
														<TableCell>{formatTime(item.inspectedAt)}</TableCell>
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
							<Label>检验项名称 *</Label>
							<Input
								value={itemForm.itemName}
								onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
								placeholder="如：尺寸检验"
							/>
						</div>
						<div>
							<Label>规格要求</Label>
							<Input
								value={itemForm.itemSpec}
								onChange={(e) => setItemForm({ ...itemForm, itemSpec: e.target.value })}
								placeholder="如：10±0.5mm"
							/>
						</div>
						<div>
							<Label>实测值</Label>
							<Input
								value={itemForm.actualValue}
								onChange={(e) => setItemForm({ ...itemForm, actualValue: e.target.value })}
								placeholder="如：10.2mm"
							/>
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
