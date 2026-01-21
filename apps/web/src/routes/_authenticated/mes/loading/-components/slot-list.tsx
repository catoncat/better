import { AlertTriangle, CheckCircle2, Unlock } from "lucide-react";
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

interface SlotListProps {
	runNo: string;
	enabled?: boolean;
	canUnlock?: boolean;
}

export function SlotList({ runNo, enabled, canUnlock }: SlotListProps) {
	const { data: expectations } = useLoadingExpectations(runNo, { enabled });
	const unlockSlot = useUnlockSlot();
	const allowUnlock = Boolean(canUnlock);

	const sortedItems = useMemo(() => {
		if (!expectations) return [];
		return [...expectations].sort((a, b) => a.position - b.position);
	}, [expectations]);

	const handleUnlock = async (slotId: string) => {
		if (confirm("确定要解锁此站位吗？")) {
			await unlockSlot.mutateAsync({ slotId, reason: "Manual Unlock" });
		}
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
