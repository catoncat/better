import { Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { NoAccessCard } from "@/components/ability/no-access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useAbility } from "@/hooks/use-ability";
import { useLoadingExpectations, useLoadTable } from "@/hooks/use-loading";
import { useRunDetail, useRunList } from "@/hooks/use-runs";
import { LoadingHistory } from "./-components/loading-history";
import { ScanPanel } from "./-components/scan-panel";
import { type SimulateScanData, SlotList } from "./-components/slot-list";

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
	const [runSearch, setRunSearch] = useState("");
	// 模拟扫码数据状态
	const [simulateScanData, setSimulateScanData] = useState<SimulateScanData | null>(null);
	const runNo = search.runNo;
	const { hasPermission } = useAbility();
	const canReadRun = hasPermission(Permission.RUN_READ);
	const canViewLoading = hasPermission(Permission.LOADING_VIEW);
	const canVerifyLoading = hasPermission(Permission.LOADING_VERIFY);
	const canConfigureLoading = hasPermission(Permission.LOADING_CONFIG);
	const canAccessLoading = canViewLoading || canVerifyLoading;

	const { data: run, isLoading: isRunLoading } = useRunDetail(runNo ?? "", {
		enabled: Boolean(runNo) && canReadRun,
	});
	const { data: runList, isLoading: isRunListLoading } = useRunList(
		{
			page: 1,
			pageSize: 20,
			status: "PREP",
			search: runSearch,
		},
		{ enabled: canReadRun },
	);
	const { data: expectations, isLoading: isExpectationsLoading } = useLoadingExpectations(runNo, {
		enabled: canViewLoading,
	});
	const loadTable = useLoadTable();

	useEffect(() => {
		setInputRunNo(search.runNo ?? "");
	}, [search.runNo]);

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

		if (inputRunNo && !options.some((option) => option.value === inputRunNo)) {
			options.unshift({ value: inputRunNo, label: inputRunNo });
		}

		return options;
	}, [runList, inputRunNo]);

	const handleRunSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputRunNo.trim()) {
			navigate({ search: { runNo: inputRunNo.trim() } });
		}
	};

	const handleLoadTable = async () => {
		if (runNo && canVerifyLoading) {
			await loadTable.mutateAsync(runNo);
		}
	};

	// 处理模拟扫码（从 SlotList 接收数据，传递给 ScanPanel）
	const handleSimulateScan = useCallback((data: SimulateScanData) => {
		setSimulateScanData(data);
	}, []);

	// 清除模拟扫码数据的回调（ScanPanel 使用后调用）
	const clearSimulateScanData = useCallback(() => {
		setSimulateScanData(null);
	}, []);

	const hasRun = Boolean(runNo && run);
	const showScan = hasRun;
	const showLoadTable =
		hasRun && (!expectations || expectations.length === 0) && !isExpectationsLoading;

	if (!canReadRun) {
		return <NoAccessCard description="需要批次查看权限才能访问该页面。" />;
	}

	if (!canAccessLoading) {
		return <NoAccessCard description="需要上料查看或验证权限才能访问该页面。" />;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">上料防错</h1>
				<p className="text-muted-foreground">执行 SMT 上料验证与换料操作</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>选择批次</CardTitle>
					<CardDescription>选择 PREP 状态批次以开始上料</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleRunSubmit} className="flex gap-4">
						<div className="grid w-full max-w-sm items-center gap-1.5">
							<Label htmlFor="runNo">批次号 (Run No)</Label>
							<Combobox
								options={runOptions}
								value={inputRunNo}
								onValueChange={setInputRunNo}
								placeholder="选择批次..."
								searchPlaceholder="搜索批次或工单号"
								emptyText={isRunListLoading ? "加载中..." : "未找到可用批次"}
								searchValue={runSearch}
								onSearchValueChange={setRunSearch}
							/>
						</div>
						<Button type="submit" className="mt-auto" disabled={!inputRunNo.trim()}>
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

			{showLoadTable &&
				(canVerifyLoading ? (
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
				) : (
					<NoAccessCard description="需要上料验证权限才能加载站位表。" />
				))}

			{runNo && showScan && (
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="space-y-6">
						{canVerifyLoading ? (
							<ScanPanel
								runNo={runNo}
								simulateScanData={simulateScanData}
								onSimulateScanConsumed={clearSimulateScanData}
							/>
						) : (
							<NoAccessCard description="需要上料验证权限才能进行扫码作业。" />
						)}
					</div>
					<div className="space-y-6">
						{canViewLoading ? (
							<SlotList
								runNo={runNo}
								canUnlock={canConfigureLoading}
								enabled={canViewLoading}
								onSimulateScan={handleSimulateScan}
							/>
						) : (
							<NoAccessCard description="需要上料查看权限才能查看站位状态。" />
						)}
					</div>
				</div>
			)}

			{runNo &&
				run &&
				(canViewLoading ? (
					<LoadingHistory runNo={runNo} enabled={canViewLoading} />
				) : (
					<NoAccessCard description="需要上料查看权限才能查看上料记录。" />
				))}
		</div>
	);
}
