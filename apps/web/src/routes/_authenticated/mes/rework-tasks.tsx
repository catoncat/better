import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
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
import { type ReworkQuery, useCompleteRework, useReworkTaskList } from "@/hooks/use-defects";

export const Route = createFileRoute("/_authenticated/mes/rework-tasks")({
	component: ReworkTasksPage,
});

function ReworkTasksPage() {
	const [query, setQuery] = useState<ReworkQuery>({
		page: 1,
		pageSize: 20,
	});

	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [completeRemark, setCompleteRemark] = useState("");

	const { data, isLoading, refetch } = useReworkTaskList(query);
	const completeRework = useCompleteRework();

	// Cast to include relations
	type ReworkTaskWithRelations = NonNullable<typeof data>["items"][number] & {
		unit?: { sn: string } | null;
		disposition?: {
			defect?: { code?: string; location?: string } | null;
		} | null;
	};
	const items = (data?.items ?? []) as ReworkTaskWithRelations[];
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
			OPEN: { label: "进行中", variant: "default" },
			DONE: { label: "已完成", variant: "secondary" },
			CANCELLED: { label: "已取消", variant: "outline" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const handleCompleteRework = () => {
		if (!selectedTaskId) return;
		completeRework.mutate(
			{
				taskId: selectedTaskId,
				remark: completeRemark || undefined,
			},
			{
				onSuccess: () => {
					setCompleteDialogOpen(false);
					setCompleteRemark("");
					setSelectedTaskId(null);
					refetch();
				},
			},
		);
	};

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">返工任务</h1>
					<p className="text-muted-foreground">返工任务跟踪与管理</p>
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
									<SelectItem value="OPEN">进行中</SelectItem>
									<SelectItem value="DONE">已完成</SelectItem>
									<SelectItem value="CANCELLED">已取消</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Rework Task List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<RotateCcw className="h-5 w-5" />
						返工任务列表
					</CardTitle>
					<CardDescription>共 {total} 条记录</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : items.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">暂无返工任务</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>单位 SN</TableHead>
									<TableHead>缺陷代码</TableHead>
									<TableHead>目标工步</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>创建时间</TableHead>
									<TableHead>完成时间</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((task) => (
									<TableRow key={task.id}>
										<TableCell className="font-mono text-sm">{task.unit?.sn ?? "-"}</TableCell>
										<TableCell>{task.disposition?.defect?.code ?? "-"}</TableCell>
										<TableCell>工步 {task.toStepNo}</TableCell>
										<TableCell>{getStatusBadge(task.status)}</TableCell>
										<TableCell>{formatTime(task.createdAt)}</TableCell>
										<TableCell>{formatTime(task.doneAt)}</TableCell>
										<TableCell className="text-right">
											{task.status === "OPEN" && (
												<Button
													size="sm"
													onClick={() => {
														setSelectedTaskId(task.id);
														setCompleteDialogOpen(true);
													}}
												>
													<CheckCircle2 className="h-4 w-4 mr-1" />
													完成
												</Button>
											)}
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

			{/* Complete Rework Dialog */}
			<Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>完成返工</DialogTitle>
						<DialogDescription>确认返工任务已完成</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>备注</Label>
							<Textarea
								value={completeRemark}
								onChange={(e) => setCompleteRemark(e.target.value)}
								placeholder="返工完成备注（可选）"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleCompleteRework} disabled={completeRework.isPending}>
							{completeRework.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							确认完成
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
