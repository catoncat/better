import { Permission } from "@better-app/db/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
	useResolveUnitBySn,
	useStationQueue,
	useStations,
	useTrackIn,
	useTrackOut,
} from "@/hooks/use-station-execution";
import { useUserProfile } from "@/hooks/use-users";

export const Route = createFileRoute("/_authenticated/mes/execution")({
	component: ExecutionPage,
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
	const [selectedStation, setSelectedStation] = useState<string>("");
	const [ngDialogOpen, setNgDialogOpen] = useState(false);
	const [ngItem, setNgItem] = useState<{ sn: string; runNo: string } | null>(null);
	const stationStorageKey = "mes.execution.station";
	const { data: userProfile } = useUserProfile();
	const { data: stations } = useStations();
	const {
		data: queueData,
		refetch: refetchQueue,
		isFetching: isQueueFetching,
	} = useStationQueue(selectedStation);
	const { mutateAsync: trackIn, isPending: isInPending } = useTrackIn();
	const { mutateAsync: trackOut, isPending: isOutPending } = useTrackOut();
	const { mutateAsync: resolveUnitBySn, isPending: isResolvingSn } = useResolveUnitBySn();
	const { hasPermission } = useAbility();
	const canTrackIn = hasPermission(Permission.EXEC_TRACK_IN);
	const canTrackOut = hasPermission(Permission.EXEC_TRACK_OUT);
	const resolveTimerRef = useRef<number | null>(null);
	const lastResolvedSnRef = useRef<string>("");

	const inForm = useForm<z.infer<typeof trackInSchema>>({
		resolver: zodResolver(trackInSchema),
		defaultValues: { sn: "", woNo: "", runNo: "" },
	});

	const outForm = useForm<z.infer<typeof trackOutSchema>>({
		resolver: zodResolver(trackOutSchema),
		defaultValues: { sn: "", runNo: "", result: "PASS" },
	});

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

	useEffect(() => {
		if (!selectedStation) return;
		const isStillAvailable = availableStations.some((station) => station.code === selectedStation);
		if (!isStillAvailable) {
			setSelectedStation("");
		}
	}, [availableStations, selectedStation]);

	const onInSubmit = async (values: z.infer<typeof trackInSchema>) => {
		if (!selectedStation || !canTrackIn) return;
		await trackIn({ stationCode: selectedStation, ...values });
		inForm.reset({ ...values, sn: "" });
		refetchQueue();
	};

	const onOutSubmit = async (values: z.infer<typeof trackOutSchema>) => {
		if (!selectedStation || !canTrackOut) return;
		await trackOut({ stationCode: selectedStation, ...values });
		outForm.reset({ ...values, sn: "" });
		refetchQueue();
	};

	const handleQueueItemClick = async (item: { sn: string; woNo: string; runNo: string }) => {
		if (!selectedStation || !canTrackOut || isOutPending) return;
		await trackOut({
			stationCode: selectedStation,
			sn: item.sn,
			runNo: item.runNo,
			result: "PASS",
		});
		outForm.reset({ sn: "", runNo: "", result: "PASS" });
		refetchQueue();
	};

	const handleOpenNgDialog = (item: { sn: string; runNo: string }) => {
		setNgItem(item);
		setNgDialogOpen(true);
	};

	const handleConfirmNg = async () => {
		if (!selectedStation || !canTrackOut || isOutPending || !ngItem) return;
		await trackOut({
			stationCode: selectedStation,
			sn: ngItem.sn,
			runNo: ngItem.runNo,
			result: "FAIL",
		});
		setNgDialogOpen(false);
		setNgItem(null);
		refetchQueue();
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

	const scheduleResolveFromSn = (sn: string, target: "in" | "out") => {
		const trimmed = sn.trim();
		if (!trimmed) return;
		if (trimmed === lastResolvedSnRef.current) return;
		if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);

		resolveTimerRef.current = window.setTimeout(async () => {
			try {
				const resolved = await resolveUnitBySn({ sn: trimmed });
				lastResolvedSnRef.current = trimmed;

				if (target === "in") {
					const currentWoNo = inForm.getValues("woNo");
					const currentRunNo = inForm.getValues("runNo");
					if (!currentWoNo && resolved.woNo) {
						inForm.setValue("woNo", resolved.woNo, { shouldValidate: true });
					}
					if (!currentRunNo && resolved.runNo) {
						inForm.setValue("runNo", resolved.runNo, { shouldValidate: true });
					}
				} else {
					const currentRunNo = outForm.getValues("runNo");
					if (!currentRunNo && resolved.runNo) {
						outForm.setValue("runNo", resolved.runNo, { shouldValidate: true });
					}
				}
			} catch {
				// Ignore resolve errors; users can still manually input WO/Run.
			}
		}, 250);
	};

	const formatTime = (value?: string | null) => {
		if (!value) return "-";
		return format(new Date(value), "HH:mm:ss");
	};

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

			{selectedStation && (
				<div className="grid gap-6 lg:grid-cols-2">
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
												<TableCell className="font-mono text-sm">{item.sn}</TableCell>
												<TableCell>
													<Badge variant="outline">Step {item.currentStepNo}</Badge>
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatTime(item.inAt)}
												</TableCell>
												<TableCell>
													<div className="flex flex-wrap gap-2">
														<Button
															variant="secondary"
															size="sm"
															disabled={!canTrackOut || isOutPending}
															onClick={() => handleQueueItemClick(item)}
														>
															一键出站
														</Button>
														<Button
															variant="outline"
															size="sm"
															disabled={!canTrackOut || isOutPending}
															onClick={() => handleOpenNgDialog({ sn: item.sn, runNo: item.runNo })}
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

					<Tabs defaultValue="in" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="in">进站 (Track In)</TabsTrigger>
							<TabsTrigger value="out">出站 (Track Out)</TabsTrigger>
						</TabsList>
						<TabsContent value="in">
							<Card>
								<CardHeader>
									<CardTitle>进站录入</CardTitle>
									<CardDescription>扫描产品序列号以开始加工</CardDescription>
								</CardHeader>
								<CardContent>
									<Form {...inForm}>
										<form onSubmit={inForm.handleSubmit(onInSubmit)} className="space-y-4">
											<FormField
												control={inForm.control}
												name="sn"
												render={({ field }) => (
													<FormItem>
														<FormLabel>产品序列号 (SN)</FormLabel>
														<FormControl>
															<Input
																placeholder="请扫描 SN..."
																autoFocus
																{...field}
																onChange={(e) => {
																	const nextValue = e.target.value;
																	const parsed = parseScanValue(nextValue);
																	field.onChange(nextValue);
																	if (!parsed) {
																		scheduleResolveFromSn(nextValue, "in");
																		return;
																	}
																	if (parsed.sn) {
																		inForm.setValue("sn", parsed.sn, { shouldValidate: true });
																	}
																	if (parsed.woNo) {
																		inForm.setValue("woNo", parsed.woNo, { shouldValidate: true });
																	}
																	if (parsed.runNo) {
																		inForm.setValue("runNo", parsed.runNo, {
																			shouldValidate: true,
																		});
																	}
																	if (parsed.sn && (!parsed.woNo || !parsed.runNo)) {
																		scheduleResolveFromSn(parsed.sn, "in");
																	}
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<div className="grid grid-cols-2 gap-4">
												<FormField
													control={inForm.control}
													name="woNo"
													render={({ field }) => (
														<FormItem>
															<FormLabel>工单号</FormLabel>
															<FormControl>
																<Input {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={inForm.control}
													name="runNo"
													render={({ field }) => (
														<FormItem>
															<FormLabel>批次号 (Run)</FormLabel>
															<FormControl>
																<Input {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
											<Button
												type="submit"
												className="w-full"
												disabled={isInPending || !canTrackIn}
											>
												{!canTrackIn ? "无进站权限" : isInPending ? "处理中..." : "确认进站"}
											</Button>
										</form>
									</Form>
								</CardContent>
							</Card>
						</TabsContent>
						<TabsContent value="out">
							<Card>
								<CardHeader>
									<CardTitle>出站录入</CardTitle>
									<CardDescription>从左侧队列点击"一键出站"直接提交，或手动输入</CardDescription>
								</CardHeader>
								<CardContent>
									<Form {...outForm}>
										<form onSubmit={outForm.handleSubmit(onOutSubmit)} className="space-y-4">
											<FormField
												control={outForm.control}
												name="sn"
												render={({ field }) => (
													<FormItem>
														<FormLabel>产品序列号 (SN)</FormLabel>
														<FormControl>
															<Input
																placeholder="请扫描 SN..."
																{...field}
																onChange={(e) => {
																	const nextValue = e.target.value;
																	field.onChange(nextValue);
																	const parsed = parseScanValue(nextValue);
																	if (parsed?.sn) {
																		outForm.setValue("sn", parsed.sn, { shouldValidate: true });
																	}
																	if (parsed?.runNo) {
																		outForm.setValue("runNo", parsed.runNo, {
																			shouldValidate: true,
																		});
																	} else {
																		scheduleResolveFromSn(parsed?.sn ?? nextValue, "out");
																	}
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={outForm.control}
												name="runNo"
												render={({ field }) => (
													<FormItem>
														<FormLabel>批次号 (Run)</FormLabel>
														<FormControl>
															<Input {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={outForm.control}
												name="result"
												render={({ field }) => (
													<FormItem>
														<FormLabel>结果</FormLabel>
														<Select onValueChange={field.onChange} value={field.value}>
															<FormControl>
																<SelectTrigger>
																	<SelectValue placeholder="选择结果" />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="PASS">合格 (PASS)</SelectItem>
																<SelectItem value="FAIL">不合格 (FAIL)</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button
												type="submit"
												className="w-full"
												disabled={isOutPending || !canTrackOut}
											>
												{!canTrackOut ? "无出站权限" : isOutPending ? "处理中..." : "确认出站"}
											</Button>
											{isResolvingSn && (
												<div className="text-xs text-muted-foreground">
													正在根据 SN 自动匹配批次…
												</div>
											)}
										</form>
									</Form>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			)}

			<Dialog open={ngDialogOpen} onOpenChange={setNgDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>确认报不良</DialogTitle>
						<DialogDescription>
							SN: {ngItem?.sn ?? "-"} · 批次号: {ngItem?.runNo ?? "-"}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setNgDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleConfirmNg} disabled={!canTrackOut || isOutPending}>
							{isOutPending ? "处理中..." : "确认报不良"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
