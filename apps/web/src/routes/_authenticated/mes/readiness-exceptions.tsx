import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useLines } from "@/hooks/use-lines";
import { type ExceptionsQuery, useReadinessExceptions } from "@/hooks/use-readiness";
import { READINESS_STATUS_MAP, RUN_STATUS_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mes/readiness-exceptions")({
	component: ReadinessExceptionsPage,
});

function ReadinessExceptionsPage() {
	const [query, setQuery] = useState<ExceptionsQuery>({
		status: "ALL",
		page: 1,
		limit: 20,
	});

	const { data: linesData } = useLines();
	const { data, isLoading } = useReadinessExceptions(query);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const currentPage = data?.page ?? 1;
	const limit = data?.limit ?? 20;
	const totalPages = Math.ceil(total / limit);

	const getRunStatusBadge = (status: string) => {
		const label = RUN_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "AUTHORIZED") variant = "default";
		if (status === "IN_PROGRESS") variant = "default";
		if (status === "COMPLETED" || status === "CLOSED_REWORK") variant = "secondary";
		if (status === "SCRAPPED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getCheckStatusBadge = (status: string) => {
		const label = READINESS_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "PASSED") variant = "default";
		if (status === "FAILED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const handleLineChange = (value: string) => {
		setQuery((prev) => ({
			...prev,
			lineId: value === "ALL" ? undefined : value,
			page: 1,
		}));
	};

	const handleStatusChange = (value: string) => {
		setQuery((prev) => ({
			...prev,
			status: value as ExceptionsQuery["status"],
			page: 1,
		}));
	};

	const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery((prev) => ({
			...prev,
			from: value || undefined,
			page: 1,
		}));
	};

	const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery((prev) => ({
			...prev,
			to: value || undefined,
			page: 1,
		}));
	};

	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > totalPages) return;
		setQuery((prev) => ({ ...prev, page: newPage }));
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">准备异常看板</h1>
				<p className="text-muted-foreground">查看准备检查失败的批次</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">筛选条件</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-4">
						<div className="space-y-2">
							<Label>产线</Label>
							<Select value={query.lineId ?? "ALL"} onValueChange={handleLineChange}>
								<SelectTrigger>
									<SelectValue placeholder="全部产线" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">全部产线</SelectItem>
									{linesData?.items.map((line) => (
										<SelectItem key={line.id} value={line.id}>
											{line.name} ({line.code})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>批次状态</Label>
							<Select value={query.status ?? "ALL"} onValueChange={handleStatusChange}>
								<SelectTrigger>
									<SelectValue placeholder="全部状态" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">全部状态</SelectItem>
									<SelectItem value="PREP">准备中</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>开始日期</Label>
							<Input type="date" value={query.from ?? ""} onChange={handleFromChange} />
						</div>

						<div className="space-y-2">
							<Label>结束日期</Label>
							<Input type="date" value={query.to ?? ""} onChange={handleToChange} />
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
							<span className="text-muted-foreground">加载中...</span>
						</div>
					) : items.length === 0 ? (
						<div className="py-12 text-center text-muted-foreground">暂无准备异常的批次</div>
					) : (
						<>
							<div className="rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>批次号</TableHead>
											<TableHead>产品代码</TableHead>
											<TableHead>产线</TableHead>
											<TableHead>批次状态</TableHead>
											<TableHead>检查状态</TableHead>
											<TableHead className="text-right">失败项</TableHead>
											<TableHead className="text-right">已豁免</TableHead>
											<TableHead>检查时间</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.map((item) => (
											<TableRow key={item.runNo}>
												<TableCell>
													<Link
														to="/mes/runs/$runNo"
														params={{ runNo: item.runNo }}
														className="font-mono text-primary hover:underline"
													>
														{item.runNo}
													</Link>
												</TableCell>
												<TableCell>{item.productCode}</TableCell>
												<TableCell>{item.lineName ?? item.lineCode ?? "-"}</TableCell>
												<TableCell>{getRunStatusBadge(item.runStatus)}</TableCell>
												<TableCell>{getCheckStatusBadge(item.checkStatus)}</TableCell>
												<TableCell className="text-right font-medium text-red-600">
													{item.failedCount}
												</TableCell>
												<TableCell className="text-right text-muted-foreground">
													{item.waivedCount}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatDateTime(item.checkedAt)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							<div className="mt-4 flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									共 {total} 条记录，第 {currentPage} / {totalPages || 1} 页
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
										上一页
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage >= totalPages}
									>
										下一页
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
