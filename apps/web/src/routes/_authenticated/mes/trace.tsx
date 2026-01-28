import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAbility } from "@/hooks/use-ability";
import { useMaterialLotTraceUnits, useUnitTrace } from "@/hooks/use-trace";
import { getApiErrorMessage } from "@/lib/api-error";
import { UNIT_STATUS_MAP } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mes/trace")({
	validateSearch: (search: Record<string, unknown>) => ({
		sn: (search.sn as string) || undefined,
	}),
	component: TracePage,
});

function TracePage() {
	const searchParams = useSearch({ from: "/_authenticated/mes/trace" });
	const navigate = useNavigate({ from: "/mes/trace" });
	const [sn, setSn] = useState("");
	const [searchSn, setSearchSn] = useState("");
	const [queryType, setQueryType] = useState<"sn" | "materialLot">("sn");
	const [materialCode, setMaterialCode] = useState("");
	const [lotNo, setLotNo] = useState("");
	const [searchMaterialCode, setSearchMaterialCode] = useState("");
	const [searchLotNo, setSearchLotNo] = useState("");
	const [mode, setMode] = useState<"run" | "latest">("run");
	const { hasPermission } = useAbility();
	const canTraceRead = hasPermission(Permission.TRACE_READ);

	const { data, isLoading, error } = useUnitTrace(searchSn, mode, { enabled: canTraceRead });
	const {
		data: materialLotUnits,
		isLoading: isMaterialLotLoading,
		error: materialLotError,
	} = useMaterialLotTraceUnits(searchMaterialCode, searchLotNo, {
		enabled: canTraceRead && queryType === "materialLot",
	});

	useEffect(() => {
		if (searchParams.sn && searchParams.sn !== searchSn) {
			setSn(searchParams.sn);
			setSearchSn(searchParams.sn);
		}
	}, [searchParams.sn, searchSn]);

	const handleSearch = () => {
		if (sn.trim()) {
			const trimmedSn = sn.trim();
			setSearchSn(trimmedSn);
			navigate({ search: { sn: trimmedSn } });
		}
	};

	const handleMaterialLotSearch = () => {
		const trimmedMaterialCode = materialCode.trim();
		const trimmedLotNo = lotNo.trim();
		if (trimmedMaterialCode && trimmedLotNo) {
			setSearchMaterialCode(trimmedMaterialCode);
			setSearchLotNo(trimmedLotNo);
		}
	};

	const handlePickSn = (selectedSn: string) => {
		setQueryType("sn");
		setSn(selectedSn);
		setSearchSn(selectedSn);
		navigate({ search: { sn: selectedSn } });
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			if (queryType === "materialLot") {
				handleMaterialLotSearch();
				return;
			}
			handleSearch();
		}
	};

	const getStatusBadge = (status: string) => {
		const label = UNIT_STATUS_MAP[status] || status;
		let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

		if (status === "IN_STATION") variant = "default";
		if (status === "DONE") variant = "secondary";
		if (status === "OUT_FAILED" || status === "SCRAPPED") variant = "destructive";

		return <Badge variant={variant}>{label}</Badge>;
	};

	const getResultBadge = (result: string | null) => {
		if (!result) return <span className="text-muted-foreground">-</span>;
		if (result === "PASS") return <Badge variant="secondary">合格</Badge>;
		if (result === "FAIL") return <Badge variant="destructive">不合格</Badge>;
		return <Badge variant="outline">{result}</Badge>;
	};

	const getInspectionBadge = (status: string) => {
		if (status === "PASS") return <Badge variant="secondary">PASS</Badge>;
		if (status === "FAIL") return <Badge variant="destructive">FAIL</Badge>;
		return <Badge variant="outline">{status}</Badge>;
	};

	const renderValue = (value: {
		valueNumber?: number | null;
		valueText?: string | null;
		valueBoolean?: boolean | null;
		valueJson?: unknown | null;
	}) => {
		if (value.valueNumber !== null && value.valueNumber !== undefined) return value.valueNumber;
		if (value.valueText !== null && value.valueText !== undefined) return value.valueText;
		if (value.valueBoolean !== null && value.valueBoolean !== undefined)
			return String(value.valueBoolean);
		if (value.valueJson !== null && value.valueJson !== undefined)
			return JSON.stringify(value.valueJson);
		return "-";
	};

	const header = (
		<div className="flex flex-col gap-2">
			<h1 className="text-3xl font-bold tracking-tight">追溯查询</h1>
			<p className="text-muted-foreground">输入产品序列号查询完整生产历史。</p>
		</div>
	);

	if (!canTraceRead) {
		return (
			<div className="space-y-6">
				{header}
				<NoAccessCard description="需要追溯查看权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{header}

			<Card>
				<CardHeader>
					<CardTitle>查询条件</CardTitle>
					<CardDescription>支持按 SN 或物料批次进行追溯查询。</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-6">
						<div className="md:col-span-2">
							<Label>查询类型</Label>
							<Select value={queryType} onValueChange={(v) => setQueryType(v as "sn" | "materialLot")}>
								<SelectTrigger className="mt-2">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="sn">序列号</SelectItem>
									<SelectItem value="materialLot">物料批次</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{queryType === "sn" ? (
							<>
								<div className="md:col-span-3">
									<Label htmlFor="sn-input">产品序列号 (SN)</Label>
									<Input
										id="sn-input"
										className="mt-2"
										value={sn}
										onChange={(e) => setSn(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="请输入或扫描产品序列号..."
									/>
								</div>
								<div className="md:col-span-1">
									<Label>查询模式</Label>
									<Select value={mode} onValueChange={(v) => setMode(v as "run" | "latest")}>
										<SelectTrigger className="mt-2">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="run">批次版本</SelectItem>
											<SelectItem value="latest">最新版本</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</>
						) : (
							<>
								<div className="md:col-span-2">
									<Label htmlFor="material-code-input">物料编码</Label>
									<Input
										id="material-code-input"
										className="mt-2"
										value={materialCode}
										onChange={(e) => setMaterialCode(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="例如 MAT-001"
									/>
								</div>
								<div className="md:col-span-2">
									<Label htmlFor="lot-no-input">批次号</Label>
									<Input
										id="lot-no-input"
										className="mt-2"
										value={lotNo}
										onChange={(e) => setLotNo(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="例如 LOT-2025-001"
									/>
								</div>
							</>
						)}

						<div className="md:col-span-1 flex items-end">
							<Button
								onClick={queryType === "sn" ? handleSearch : handleMaterialLotSearch}
								disabled={
									queryType === "sn"
										? !sn.trim() || isLoading
										: !materialCode.trim() || !lotNo.trim() || isMaterialLotLoading
								}
								className="w-full"
							>
								<Search className="mr-2 h-4 w-4" />
								查询
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{error && queryType === "sn" && (
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
					查询失败：{getApiErrorMessage(error, "未知错误")}
				</div>
			)}

			{materialLotError && queryType === "materialLot" && (
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
					查询失败：{getApiErrorMessage(materialLotError, "未知错误")}
				</div>
			)}

			{isLoading && queryType === "sn" && (
				<div className="text-sm text-muted-foreground">正在查询...</div>
			)}

			{isMaterialLotLoading && queryType === "materialLot" && (
				<div className="text-sm text-muted-foreground">正在查询批次...</div>
			)}

			{queryType === "materialLot" && materialLotUnits && (
				<Card>
					<CardHeader>
						<CardTitle>批次追溯结果</CardTitle>
						<CardDescription>
							共 {materialLotUnits.units.length} 个序列号
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>序列号</TableHead>
									<TableHead>状态</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{materialLotUnits.units.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3} className="text-center text-muted-foreground">
											未找到关联序列号
										</TableCell>
									</TableRow>
								) : (
									materialLotUnits.units.map((unit) => (
										<TableRow key={unit.sn}>
											<TableCell className="font-medium">{unit.sn}</TableCell>
											<TableCell>{getStatusBadge(unit.status)}</TableCell>
											<TableCell>
												<Button variant="outline" size="sm" onClick={() => handlePickSn(unit.sn)}>
													查看追溯
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{data && queryType === "sn" && (
				<>
					<Card>
						<CardHeader>
							<CardTitle>产品信息</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-4">
							<div>
								<p className="text-sm text-muted-foreground">序列号</p>
								<p className="font-medium">{data.unit.sn}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">状态</p>
								<div className="mt-1">{getStatusBadge(data.unit.status)}</div>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">工单号</p>
								<p className="font-medium">{data.unit.woNo}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">批次号</p>
								<p className="font-medium">{data.unit.runNo ?? "-"}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>路由信息</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-4">
							<div>
								<p className="text-sm text-muted-foreground">路由编码</p>
								<p className="font-medium">{data.route.code}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">来源系统</p>
								<Badge variant="outline">{data.route.sourceSystem}</Badge>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">版本号</p>
								<p className="font-medium">v{data.routeVersion.versionNo}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">编译时间</p>
								<p className="font-medium">{formatDateTime(data.routeVersion.compiledAt)}</p>
							</div>
						</CardContent>
					</Card>

					{data.steps.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>工序定义</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>步骤</TableHead>
											<TableHead>工序ID</TableHead>
											<TableHead>站位类型</TableHead>
											<TableHead>站组</TableHead>
											<TableHead>允许站位</TableHead>
											<TableHead>FAI</TableHead>
											<TableHead>授权</TableHead>
											<TableHead>数据采集</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.steps.map((step) => (
											<TableRow key={`step-${step.stepNo}-${step.operationId}`}>
												<TableCell className="font-medium">Step {step.stepNo}</TableCell>
												<TableCell>{step.operationId}</TableCell>
												<TableCell>{step.stationType}</TableCell>
												<TableCell>{step.stationGroupId ?? "-"}</TableCell>
												<TableCell>
													{step.allowedStationIds.length
														? step.allowedStationIds.join(", ")
														: "-"}
												</TableCell>
												<TableCell>{step.requiresFAI ? "是" : "否"}</TableCell>
												<TableCell>{step.requiresAuthorization ? "是" : "否"}</TableCell>
												<TableCell>
													{step.dataSpecIds.length ? step.dataSpecIds.join(", ") : "-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader>
							<CardTitle>执行记录</CardTitle>
							<CardDescription>产品经过的每个步骤及结果。</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>步骤</TableHead>
										<TableHead>工序</TableHead>
										<TableHead>进站时间</TableHead>
										<TableHead>出站时间</TableHead>
										<TableHead>结果</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.tracks.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="text-center text-muted-foreground">
												暂无执行记录
											</TableCell>
										</TableRow>
									) : (
										data.tracks.map((track) => (
											<TableRow key={`track-${track.stepNo}-${track.inAt}`}>
												<TableCell className="font-medium">Step {track.stepNo}</TableCell>
												<TableCell>{track.operation ?? "-"}</TableCell>
												<TableCell>{formatDateTime(track.inAt)}</TableCell>
												<TableCell>{formatDateTime(track.outAt)}</TableCell>
												<TableCell>{getResultBadge(track.result)}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					{data.dataValues.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>采集数据</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>步骤</TableHead>
											<TableHead>数据项</TableHead>
											<TableHead>值</TableHead>
											<TableHead>判定</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.dataValues.map((dv) => (
											<TableRow key={`dv-${dv.stepNo}-${dv.name}`}>
												<TableCell>{dv.stepNo ? `Step ${dv.stepNo}` : "-"}</TableCell>
												<TableCell>{dv.name}</TableCell>
												<TableCell>{renderValue(dv)}</TableCell>
												<TableCell>
													{dv.judge ? (
														<Badge variant={dv.judge === "PASS" ? "secondary" : "destructive"}>
															{dv.judge}
														</Badge>
													) : (
														"-"
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.inspections.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>质量检验</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>类型</TableHead>
											<TableHead>状态</TableHead>
											<TableHead>开始时间</TableHead>
											<TableHead>判定时间</TableHead>
											<TableHead>检验人</TableHead>
											<TableHead>结果</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.inspections.map((inspection) => (
											<TableRow key={inspection.id}>
												<TableCell className="font-medium">{inspection.type}</TableCell>
												<TableCell>{getInspectionBadge(inspection.status)}</TableCell>
												<TableCell>{formatDateTime(inspection.startedAt)}</TableCell>
												<TableCell>{formatDateTime(inspection.decidedAt)}</TableCell>
												<TableCell>{inspection.inspectorId ?? "-"}</TableCell>
												<TableCell>
													{inspection.unitItems.pass}/{inspection.unitItems.fail}/
													{inspection.unitItems.na}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.defects.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>缺陷记录</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>缺陷代码</TableHead>
											<TableHead>位置</TableHead>
											<TableHead>数量</TableHead>
											<TableHead>状态</TableHead>
											<TableHead>维修记录</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.defects.map((defect) => {
											const record = defect.disposition?.reworkTask?.repairRecord ?? null;
											return (
												<TableRow key={defect.id}>
													<TableCell className="font-medium">{defect.code}</TableCell>
													<TableCell>{defect.location ?? "-"}</TableCell>
													<TableCell>{defect.qty}</TableCell>
													<TableCell>
														<Badge variant="outline">{defect.status}</Badge>
													</TableCell>
													<TableCell>
														{record ? (
															<div className="space-y-1 text-xs">
																<div className="font-medium">{record.action}</div>
																<div>结果：{record.result}</div>
																{record.reason ? <div>原因：{record.reason}</div> : null}
																<div className="text-muted-foreground">
																	{formatDateTime(record.recordedAt)}
																</div>
															</div>
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.loadingRecords.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>上料记录</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>槽位</TableHead>
											<TableHead>位置</TableHead>
											<TableHead>物料</TableHead>
											<TableHead>批次</TableHead>
											<TableHead>状态</TableHead>
											<TableHead>校验</TableHead>
											<TableHead>上料时间</TableHead>
											<TableHead>下料时间</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.loadingRecords.map((record) => (
											<TableRow key={record.id}>
												<TableCell className="font-medium">
													{record.slotCode}
												</TableCell>
												<TableCell>{record.position}</TableCell>
												<TableCell>{record.materialCode}</TableCell>
												<TableCell>{record.lotNo}</TableCell>
												<TableCell>
													<Badge variant="outline">{record.status}</Badge>
												</TableCell>
												<TableCell>
													<Badge variant={record.verifyResult === "PASS" ? "secondary" : "destructive"}>
														{record.verifyResult}
													</Badge>
												</TableCell>
												<TableCell>{formatDateTime(record.loadedAt)}</TableCell>
												<TableCell>{formatDateTime(record.unloadedAt)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.materials.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>物料追溯</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>位置</TableHead>
											<TableHead>物料编码</TableHead>
											<TableHead>批次号</TableHead>
											<TableHead>关键件</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.materials.map((mat) => (
											<TableRow key={`mat-${mat.materialCode}-${mat.lotNo}`}>
												<TableCell>{mat.position ?? "-"}</TableCell>
												<TableCell className="font-medium">{mat.materialCode}</TableCell>
												<TableCell>{mat.lotNo}</TableCell>
												<TableCell>
													{mat.isKeyPart ? (
														<Badge>是</Badge>
													) : (
														<span className="text-muted-foreground">否</span>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.ingestEvents.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Ingest 事件</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>类型</TableHead>
											<TableHead>来源</TableHead>
											<TableHead>发生时间</TableHead>
											<TableHead>载具</TableHead>
											<TableHead>SN</TableHead>
											<TableHead>结果</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.ingestEvents.map((event) => (
											<TableRow key={event.id}>
												<TableCell className="font-medium">{event.eventType}</TableCell>
												<TableCell>{event.sourceSystem}</TableCell>
												<TableCell>{formatDateTime(event.occurredAt)}</TableCell>
												<TableCell>{event.carrierCode ?? "-"}</TableCell>
												<TableCell>{event.sn ?? event.snList?.join(", ") ?? "-"}</TableCell>
												<TableCell>{getResultBadge(event.result)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.carrierTracks.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>载具过站记录</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>载具号</TableHead>
											<TableHead>步骤</TableHead>
											<TableHead>进站时间</TableHead>
											<TableHead>出站时间</TableHead>
											<TableHead>结果</TableHead>
											<TableHead>数据量</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.carrierTracks.map((track) => (
											<TableRow key={track.id}>
												<TableCell className="font-medium">{track.carrierNo}</TableCell>
												<TableCell>Step {track.stepNo}</TableCell>
												<TableCell>{formatDateTime(track.inAt)}</TableCell>
												<TableCell>{formatDateTime(track.outAt)}</TableCell>
												<TableCell>{getResultBadge(track.result)}</TableCell>
												<TableCell>{track.dataValueCount}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.carrierLoads.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>载具装载记录</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>载具号</TableHead>
											<TableHead>装载时间</TableHead>
											<TableHead>卸载时间</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.carrierLoads.map((load) => (
											<TableRow key={load.id}>
												<TableCell className="font-medium">{load.carrierNo}</TableCell>
												<TableCell>{formatDateTime(load.loadedAt)}</TableCell>
												<TableCell>{formatDateTime(load.unloadedAt)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{data.carrierDataValues.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>载具采集数据</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>载具号</TableHead>
											<TableHead>步骤</TableHead>
											<TableHead>数据项</TableHead>
											<TableHead>值</TableHead>
											<TableHead>判定</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.carrierDataValues.map((value, idx) => (
											<TableRow key={`${value.carrierTrackId ?? "n/a"}-${idx}`}>
												<TableCell className="font-medium">{value.carrierNo ?? "-"}</TableCell>
												<TableCell>{value.stepNo ? `Step ${value.stepNo}` : "-"}</TableCell>
												<TableCell>{value.name}</TableCell>
												<TableCell>{renderValue(value)}</TableCell>
												<TableCell>
													{value.judge ? (
														<Badge variant={value.judge === "PASS" ? "secondary" : "destructive"}>
															{value.judge}
														</Badge>
													) : (
														"-"
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
