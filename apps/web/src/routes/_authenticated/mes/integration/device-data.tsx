import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAbility } from "@/hooks/use-ability";
import {
	type DeviceDataRecord,
	type DeviceDataRecordQuery,
	useDeviceDataRecordList,
} from "@/hooks/use-device-data-records";
import { formatDateTime } from "@/lib/utils";

interface DeviceDataSearchParams {
	eventId?: string;
	runNo?: string;
	unitSn?: string;
	stationCode?: string;
	stepNo?: number;
	source?: "AUTO" | "MANUAL";
	eventFrom?: string;
	eventTo?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/integration/device-data")({
	validateSearch: (search: Record<string, unknown>): DeviceDataSearchParams => ({
		eventId: (search.eventId as string) || undefined,
		runNo: (search.runNo as string) || undefined,
		unitSn: (search.unitSn as string) || undefined,
		stationCode: (search.stationCode as string) || undefined,
		stepNo: Number(search.stepNo) || undefined,
		source: (search.source as "AUTO" | "MANUAL") || undefined,
		eventFrom: (search.eventFrom as string) || undefined,
		eventTo: (search.eventTo as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: DeviceDataPage,
});

function DeviceDataPage() {
	const { hasPermission } = useAbility();
	const canViewIntegration = hasPermission(Permission.SYSTEM_INTEGRATION);
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

	const query: DeviceDataRecordQuery = useMemo(
		() => ({
			eventId: searchParams.eventId || undefined,
			runNo: searchParams.runNo || undefined,
			unitSn: searchParams.unitSn || undefined,
			stationCode: searchParams.stationCode || undefined,
			stepNo: searchParams.stepNo || undefined,
			source: searchParams.source || undefined,
			eventFrom: searchParams.eventFrom || undefined,
			eventTo: searchParams.eventTo || undefined,
			page: searchParams.page ?? 1,
			pageSize: searchParams.pageSize ?? 30,
		}),
		[searchParams],
	);

	const { data, isLoading, isFetching, refetch } = useDeviceDataRecordList(query, {
		enabled: canViewIntegration,
	});

	const header = (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">设备数采</h1>
			<p className="text-muted-foreground">查看已接收的设备数据事件（POC）</p>
		</div>
	);

	const setFilter = useCallback(
		(key: keyof DeviceDataSearchParams, value: unknown) => {
			const normalized =
				typeof value === "string" ? (value.trim() ? value.trim() : undefined) : value;

			navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					[key]: normalized || undefined,
					page: 1,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	const setPage = useCallback(
		(page: number) => {
			navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					page,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	if (!canViewIntegration) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要系统集成权限才能查看设备数采事件。" />
			</div>
		);
	}

	const total = data?.total ?? 0;
	const page = data?.page ?? searchParams.page ?? 1;
	const pageSize = data?.pageSize ?? searchParams.pageSize ?? 30;
	const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				{header}
				<Can permissions={Permission.SYSTEM_INTEGRATION}>
					<Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
						{isFetching ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						刷新
					</Button>
				</Can>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>筛选</CardTitle>
					<CardDescription>按事件、批次、站位或时间范围筛选</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
						<Input
							placeholder="eventId"
							value={searchParams.eventId ?? ""}
							onChange={(e) => setFilter("eventId", e.target.value)}
						/>
						<Input
							placeholder="runNo"
							value={searchParams.runNo ?? ""}
							onChange={(e) => setFilter("runNo", e.target.value)}
						/>
						<Input
							placeholder="unitSn"
							value={searchParams.unitSn ?? ""}
							onChange={(e) => setFilter("unitSn", e.target.value)}
						/>
						<Input
							placeholder="stationCode"
							value={searchParams.stationCode ?? ""}
							onChange={(e) => setFilter("stationCode", e.target.value)}
						/>
						<Input
							type="number"
							placeholder="stepNo"
							value={searchParams.stepNo ?? ""}
							onChange={(e) =>
								setFilter("stepNo", e.target.value ? Number(e.target.value) : undefined)
							}
						/>
						<Select
							value={searchParams.source ?? "ALL"}
							onValueChange={(v) =>
								setFilter("source", v === "ALL" ? undefined : (v as "AUTO" | "MANUAL"))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="source" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">全部</SelectItem>
								<SelectItem value="AUTO">AUTO</SelectItem>
								<SelectItem value="MANUAL">MANUAL</SelectItem>
							</SelectContent>
						</Select>
						<Input
							type="datetime-local"
							value={searchParams.eventFrom ?? ""}
							onChange={(e) => setFilter("eventFrom", e.target.value)}
						/>
						<Input
							type="datetime-local"
							value={searchParams.eventTo ?? ""}
							onChange={(e) => setFilter("eventTo", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-4">
						<div>
							<CardTitle>事件列表</CardTitle>
							<CardDescription>
								共 {total} 条，当前第 {page}/{totalPages} 页
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1}
								onClick={() => setPage(Math.max(1, page - 1))}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								onClick={() => setPage(Math.min(totalPages, page + 1))}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>时间</TableHead>
								<TableHead>eventId</TableHead>
								<TableHead>来源</TableHead>
								<TableHead>runNo</TableHead>
								<TableHead>unitSn</TableHead>
								<TableHead>station</TableHead>
								<TableHead>step</TableHead>
								<TableHead>数据</TableHead>
								<TableHead>写入</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={9} className="h-24 text-center">
										<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
									</TableCell>
								</TableRow>
							) : !data?.items.length ? (
								<TableRow>
									<TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
										暂无数据
									</TableCell>
								</TableRow>
							) : (
								data.items.map((record) => <DeviceDataRow key={record.id} record={record} />)
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

function DeviceDataRow({ record }: { record: DeviceDataRecord }) {
	const summary = useMemo(() => buildDataSummary(record), [record]);

	return (
		<TableRow>
			<TableCell className="whitespace-nowrap">
				{record.eventTime ? formatDateTime(new Date(record.eventTime)) : "-"}
			</TableCell>
			<TableCell className="max-w-[240px]">
				<code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{record.eventId}</code>
			</TableCell>
			<TableCell>
				<Badge variant={record.source === "AUTO" ? "default" : "secondary"}>{record.source}</Badge>
			</TableCell>
			<TableCell>{record.runNo ?? "-"}</TableCell>
			<TableCell className="max-w-[200px] break-all">{record.unitSn ?? "-"}</TableCell>
			<TableCell>{record.stationCode ?? "-"}</TableCell>
			<TableCell>{record.stepNo ?? "-"}</TableCell>
			<TableCell className="max-w-[420px]">
				<span className="text-xs text-muted-foreground break-words">{summary || "-"}</span>
			</TableCell>
			<TableCell className="whitespace-nowrap">
				<span className="text-sm">{record.dataValuesCreated}</span>
			</TableCell>
		</TableRow>
	);
}

function buildDataSummary(record: DeviceDataRecord): string {
	const data = Array.isArray(record.data) ? record.data : [];
	if (data.length === 0) return "";

	const formatValue = (item: (typeof data)[number]) => {
		if (item.valueNumber !== undefined) return String(item.valueNumber);
		if (item.valueText !== undefined) return item.valueText;
		if (item.valueBoolean !== undefined) return item.valueBoolean ? "true" : "false";
		if (item.valueJson !== undefined) {
			try {
				return JSON.stringify(item.valueJson);
			} catch {
				return "[json]";
			}
		}
		return "";
	};

	return data
		.slice(0, 3)
		.map((item) => {
			const name = item.specName || item.specId || "spec";
			const value = formatValue(item);
			return value ? `${name}=${value}` : name;
		})
		.join(", ");
}
