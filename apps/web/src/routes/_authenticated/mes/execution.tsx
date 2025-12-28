import { Permission } from "@better-app/db/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
	useStationQueue,
	useStations,
	useTrackIn,
	useTrackOut,
} from "@/hooks/use-station-execution";

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
	const { data: stations } = useStations();
	const {
		data: queueData,
		refetch: refetchQueue,
		isFetching: isQueueFetching,
	} = useStationQueue(selectedStation);
	const { mutateAsync: trackIn, isPending: isInPending } = useTrackIn();
	const { mutateAsync: trackOut, isPending: isOutPending } = useTrackOut();
	const { hasPermission } = useAbility();
	const canTrackIn = hasPermission(Permission.EXEC_TRACK_IN);
	const canTrackOut = hasPermission(Permission.EXEC_TRACK_OUT);

	const inForm = useForm<z.infer<typeof trackInSchema>>({
		resolver: zodResolver(trackInSchema),
		defaultValues: { sn: "", woNo: "", runNo: "" },
	});

	const outForm = useForm<z.infer<typeof trackOutSchema>>({
		resolver: zodResolver(trackOutSchema),
		defaultValues: { sn: "", runNo: "", result: "PASS" },
	});

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

	const handleQueueItemClick = (item: { sn: string; woNo: string; runNo: string }) => {
		if (!canTrackOut) return;
		outForm.setValue("sn", item.sn);
		outForm.setValue("runNo", item.runNo);
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
					<Select value={selectedStation} onValueChange={setSelectedStation}>
						<SelectTrigger className="w-[300px]">
							<SelectValue placeholder="请选择工位..." />
						</SelectTrigger>
						<SelectContent>
							{stations?.items.map((s) => (
								<SelectItem key={s.code} value={s.code}>
									{s.name} ({s.code}) - {s.line?.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
													<Button
														variant="secondary"
														size="sm"
														disabled={!canTrackOut}
														onClick={() => handleQueueItemClick(item)}
													>
														出站
													</Button>
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
															<Input placeholder="请扫描 SN..." autoFocus {...field} />
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
									<CardDescription>从左侧队列点击"出站"可自动填充，或手动输入</CardDescription>
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
															<Input placeholder="请扫描 SN..." {...field} />
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
										</form>
									</Form>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			)}
		</div>
	);
}
