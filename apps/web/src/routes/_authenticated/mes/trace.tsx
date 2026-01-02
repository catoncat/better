import { createFileRoute, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useUnitTrace } from "@/hooks/use-trace";

export const Route = createFileRoute("/_authenticated/mes/trace")({
	validateSearch: (search: Record<string, unknown>) => ({
		sn: (search.sn as string) || undefined,
	}),
	component: TracePage,
});

function TracePage() {
	const searchParams = useSearch({ from: "/_authenticated/mes/trace" });
	const [sn, setSn] = useState("");
	const [searchSn, setSearchSn] = useState("");
	const [mode, setMode] = useState<"run" | "latest">("run");

	const { data, isLoading, error } = useUnitTrace(searchSn, mode);

	useEffect(() => {
		if (searchParams.sn && searchParams.sn !== searchSn) {
			setSn(searchParams.sn);
			setSearchSn(searchParams.sn);
		}
	}, [searchParams.sn, searchSn]);

	const handleSearch = () => {
		if (sn.trim()) {
			setSearchSn(sn.trim());
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	const formatTime = (value?: string | null) => {
		if (!value) return "-";
		return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
	};

	const getStatusBadge = (status: string) => {
		const map: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
		> = {
			IDLE: { label: "空闲", variant: "outline" },
			IN_STATION: { label: "在站", variant: "default" },
			DONE: { label: "完成", variant: "secondary" },
			NG: { label: "不良", variant: "destructive" },
			SCRAPPED: { label: "报废", variant: "destructive" },
			HOLD: { label: "冻结", variant: "outline" },
		};
		const config = map[status] ?? { label: status, variant: "outline" as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getResultBadge = (result: string | null) => {
		if (!result) return <span className="text-muted-foreground">-</span>;
		if (result === "PASS") return <Badge variant="secondary">合格</Badge>;
		if (result === "FAIL") return <Badge variant="destructive">不合格</Badge>;
		return <Badge variant="outline">{result}</Badge>;
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">追溯查询</h1>
				<p className="text-muted-foreground">输入产品序列号查询完整生产历史。</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>查询条件</CardTitle>
					<CardDescription>输入 SN 后按回车或点击查询按钮。</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4 md:flex-row md:items-end">
						<div className="flex-1">
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
						<div className="w-40">
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
						<Button onClick={handleSearch} disabled={!sn.trim() || isLoading}>
							<Search className="mr-2 h-4 w-4" />
							查询
						</Button>
					</div>
				</CardContent>
			</Card>

			{error && (
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
					查询失败：{error instanceof Error ? error.message : "未知错误"}
				</div>
			)}

			{isLoading && <div className="text-sm text-muted-foreground">正在查询...</div>}

			{data && (
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
								<p className="font-medium">{formatTime(data.routeVersion.compiledAt)}</p>
							</div>
						</CardContent>
					</Card>

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
												<TableCell>{formatTime(track.inAt)}</TableCell>
												<TableCell>{formatTime(track.outAt)}</TableCell>
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
												<TableCell>
													{dv.valueNumber ??
														dv.valueText ??
														(dv.valueBoolean !== null ? String(dv.valueBoolean) : "-")}
												</TableCell>
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
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.defects.map((defect) => (
											<TableRow key={defect.id}>
												<TableCell className="font-medium">{defect.code}</TableCell>
												<TableCell>{defect.location ?? "-"}</TableCell>
												<TableCell>{defect.qty}</TableCell>
												<TableCell>
													<Badge variant="outline">{defect.status}</Badge>
												</TableCell>
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
				</>
			)}
		</div>
	);
}
