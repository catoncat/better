import { AlertTriangle, CheckCircle2, ScanLine, Unlock } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLoadingExpectations, useUnlockSlot } from "@/hooks/use-loading";
import { useMaterialLotList } from "@/hooks/use-material-lots";

export interface SimulateScanData {
	slotCode: string;
	materialLotBarcode: string;
}

interface SlotListProps {
	runNo: string;
	enabled?: boolean;
	canUnlock?: boolean;
	onSimulateScan?: (data: SimulateScanData) => void;
}

export function SlotList({ runNo, enabled, canUnlock, onSimulateScan }: SlotListProps) {
	const { data: expectations } = useLoadingExpectations(runNo, { enabled });
	const unlockSlot = useUnlockSlot();
	const allowUnlock = Boolean(canUnlock);

	// 收集所有期望物料编码，用于查询实际物料批次
	const expectedMaterialCodes = useMemo(() => {
		if (!expectations) return [];
		const codes = new Set<string>();
		for (const e of expectations) {
			codes.add(e.expectedMaterialCode);
			if (e.alternates) {
				for (const alt of e.alternates) {
					codes.add(alt);
				}
			}
		}
		return Array.from(codes);
	}, [expectations]);

	// 查询物料批次（只有当有期望物料时才查询）
	const { data: materialLotsData } = useMaterialLotList(
		expectedMaterialCodes.length > 0 ? { limit: "100" } : {},
	);

	// 构建物料编码 -> 批次号的映射（使用真实数据）
	const materialLotMap = useMemo(() => {
		const map = new Map<string, string>();
		if (materialLotsData?.items) {
			for (const lot of materialLotsData.items) {
				// 只保留第一个（最新的）批次
				if (!map.has(lot.materialCode)) {
					map.set(lot.materialCode, lot.lotNo);
				}
			}
		}
		return map;
	}, [materialLotsData]);

	const sortedItems = useMemo(() => {
		if (!expectations) return [];
		return [...expectations].sort((a, b) => a.position - b.position);
	}, [expectations]);

	const handleUnlock = async (slotId: string) => {
		if (confirm("确定要解锁此站位吗？")) {
			await unlockSlot.mutateAsync({ slotId, reason: "Manual Unlock" });
		}
	};

	const handleSimulateScan = (slotCode: string, materialCode: string) => {
		if (!onSimulateScan) return;

		// 从真实数据中查找该物料的批次号
		const lotNo = materialLotMap.get(materialCode);
		if (!lotNo) {
			// 如果没有找到批次，显示提示
			alert(`未找到物料 ${materialCode} 的批次数据，请先在系统中创建物料批次。`);
			return;
		}

		// 构造条码格式：物料编码|批次号
		const barcode = `${materialCode}|${lotNo}`;
		onSimulateScan({ slotCode, materialLotBarcode: barcode });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>站位状态</CardTitle>
				<CardDescription>
					总计: {expectations?.length ?? 0} | 已上料:{" "}
					{expectations?.filter((e) => e.status === "LOADED").length ?? 0}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>站位 (Pos)</TableHead>
							<TableHead>期望物料</TableHead>
							<TableHead>当前物料</TableHead>
							<TableHead>状态</TableHead>
							<TableHead>操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedItems.map((item) => (
							<TableRow key={item.id}>
								<TableCell className="font-medium">
									{item.slotCode} ({item.position})
								</TableCell>
								<TableCell className="font-mono">
									{item.expectedMaterialCode}
									{item.alternates && item.alternates.length > 0 && (
										<span className="text-xs text-muted-foreground ml-1">
											(+{item.alternates.length} alt)
										</span>
									)}
								</TableCell>
								<TableCell className="font-mono">{item.loadedMaterialCode || "-"}</TableCell>
								<TableCell>
									{item.status === "LOADED" ? (
										<Badge variant="default" className="bg-green-600 hover:bg-green-700">
											<CheckCircle2 className="mr-1 h-3 w-3" /> 已上料
										</Badge>
									) : item.status === "MISMATCH" ? (
										<Badge variant="destructive">
											<AlertTriangle className="mr-1 h-3 w-3" /> 错误
										</Badge>
									) : (
										<Badge variant="outline">待上料</Badge>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-1">
										{/* 模拟扫码按钮 - 仅用于演示 */}
										{onSimulateScan && item.status === "PENDING" && (
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={() =>
																handleSimulateScan(item.slotCode, item.expectedMaterialCode)
															}
														>
															<ScanLine className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>模拟扫码（演示用）</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
										{item.isLocked && allowUnlock ? (
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={() => handleUnlock(item.slotId)}
														>
															<Unlock className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>解锁站位</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										) : null}
									</div>
								</TableCell>
							</TableRow>
						))}
						{(!expectations || expectations.length === 0) && (
							<TableRow>
								<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
									暂无站位信息，请先加载站位表。
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
