import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoadingExpectations, useLoadTable } from "@/hooks/use-loading";
import { useRunDetail } from "@/hooks/use-runs";
import { ScanPanel } from "./-components/scan-panel";
import { SlotList } from "./-components/slot-list";

const loadingSearchSchema = z.object({
	runNo: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/mes/loading/")({
	component: LoadingPage,
	validateSearch: loadingSearchSchema,
});

function LoadingPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [inputRunNo, setInputRunNo] = useState(search.runNo ?? "");
	const runNo = search.runNo;

	const { data: run, isLoading: isRunLoading } = useRunDetail(runNo ?? "");
	const { data: expectations, isLoading: isExpectationsLoading } = useLoadingExpectations(runNo);
	const loadTable = useLoadTable();

	const handleRunSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputRunNo.trim()) {
			navigate({ search: { runNo: inputRunNo.trim() } });
		}
	};

	const handleLoadTable = async () => {
		if (runNo) {
			await loadTable.mutateAsync(runNo);
		}
	};

	const showScan = Boolean(runNo && run && expectations && expectations.length > 0);
	const showLoadTable =
		run && (!expectations || expectations.length === 0) && !isExpectationsLoading;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">上料防错</h1>
				<p className="text-muted-foreground">执行 SMT 上料验证与换料操作</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>选择批次</CardTitle>
					<CardDescription>输入批次号以开始上料</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleRunSubmit} className="flex gap-4">
						<div className="grid w-full max-w-sm items-center gap-1.5">
							<Label htmlFor="runNo">批次号 (Run No)</Label>
							<Input
								id="runNo"
								value={inputRunNo}
								onChange={(e) => setInputRunNo(e.target.value)}
								placeholder="例如: RUN-20240101-001"
							/>
						</div>
						<Button type="submit" className="mt-auto">
							确定
						</Button>
					</form>
				</CardContent>
			</Card>

			{isRunLoading && (
				<div className="flex justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{!isRunLoading && search.runNo && !run && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						未找到批次 {search.runNo}
					</CardContent>
				</Card>
			)}

			{showLoadTable && (
				<Card>
					<CardHeader>
						<CardTitle>初始化站位表</CardTitle>
						<CardDescription>当前批次尚未加载站位期望，请点击下方按钮加载。</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleLoadTable} disabled={loadTable.isPending}>
							{loadTable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							加载站位表
						</Button>
					</CardContent>
				</Card>
			)}

			{runNo && showScan && (
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="space-y-6">
						<ScanPanel runNo={runNo} />
					</div>
					<div className="space-y-6">
						<SlotList runNo={runNo} />
					</div>
				</div>
			)}
		</div>
	);
}
