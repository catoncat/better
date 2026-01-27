import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DailyQcStatsData, DailyQcStatsItem } from "@/hooks/use-daily-qc-records";

interface DailyQcStatsProps {
	data?: DailyQcStatsData;
	isLoading: boolean;
	error?: string | null;
}

const formatNumber = (value: number) => value.toLocaleString("zh-CN");

const formatRate = (value: number | null) =>
	value === null ? "-" : `${(value * 100).toFixed(2)}%`;

const renderLabel = (value: string | null, fallback: string) => value || fallback;

const renderRow = (item: DailyQcStatsItem) => (
	<TableRow key={`${item.shiftCode ?? "NA"}-${item.timeWindow ?? "NA"}`}>
		<TableCell>{renderLabel(item.shiftCode, "未填班次")}</TableCell>
		<TableCell>{renderLabel(item.timeWindow, "未填时段")}</TableCell>
		<TableCell>{formatNumber(item.totalRecords)}</TableCell>
		<TableCell>{formatNumber(item.inspectedQty)}</TableCell>
		<TableCell>{formatNumber(item.defectBoardQty)}</TableCell>
		<TableCell>{formatRate(item.defectBoardRate)}</TableCell>
		<TableCell>{formatNumber(item.defectQty)}</TableCell>
		<TableCell>{formatRate(item.defectRate)}</TableCell>
	</TableRow>
);

export function DailyQcStats({ data, isLoading, error }: DailyQcStatsProps) {
	const totals = data?.totals;
	const items = data?.items ?? [];

	return (
		<Card>
			<CardHeader className="flex flex-col gap-1">
				<CardTitle className="text-base">班次/时段统计</CardTitle>
				{error ? <p className="text-sm text-destructive">统计加载失败：{error}</p> : null}
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-md border border-border bg-muted/30 p-3">
						<div className="text-xs text-muted-foreground">记录数</div>
						<div className="text-lg font-semibold">{formatNumber(totals?.totalRecords ?? 0)}</div>
					</div>
					<div className="rounded-md border border-border bg-muted/30 p-3">
						<div className="text-xs text-muted-foreground">检验数</div>
						<div className="text-lg font-semibold">{formatNumber(totals?.inspectedQty ?? 0)}</div>
					</div>
					<div className="rounded-md border border-border bg-muted/30 p-3">
						<div className="text-xs text-muted-foreground">不良板数</div>
						<div className="text-lg font-semibold">{formatNumber(totals?.defectBoardQty ?? 0)}</div>
					</div>
					<div className="rounded-md border border-border bg-muted/30 p-3">
						<div className="text-xs text-muted-foreground">不良点数</div>
						<div className="text-lg font-semibold">{formatNumber(totals?.defectQty ?? 0)}</div>
					</div>
				</div>

				<div className="rounded-md border border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>班次</TableHead>
								<TableHead>时段</TableHead>
								<TableHead>记录数</TableHead>
								<TableHead>检验数</TableHead>
								<TableHead>不良板</TableHead>
								<TableHead>不良板率</TableHead>
								<TableHead>不良点</TableHead>
								<TableHead>不良率</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="text-sm text-muted-foreground">
										统计加载中...
									</TableCell>
								</TableRow>
							) : items.length > 0 ? (
								items.map(renderRow)
							) : (
								<TableRow>
									<TableCell colSpan={8} className="text-sm text-muted-foreground">
										暂无统计数据
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
