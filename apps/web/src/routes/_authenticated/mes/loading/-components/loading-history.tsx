import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLoadingRecords } from "@/hooks/use-loading";
import { formatDateTime } from "@/lib/utils";

interface LoadingHistoryProps {
	runNo: string;
}

const statusLabelMap: Record<
	string,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	LOADED: { label: "上料", variant: "default" },
	REPLACED: { label: "已换料", variant: "secondary" },
	UNLOADED: { label: "异常", variant: "outline" },
};

export function LoadingHistory({ runNo }: LoadingHistoryProps) {
	const { data: records, isLoading } = useLoadingRecords(runNo);

	return (
		<Card>
			<CardHeader>
				<CardTitle>上料/换料记录</CardTitle>
				<CardDescription>展示本批次的上料与换料历史记录</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>时间</TableHead>
							<TableHead>站位</TableHead>
							<TableHead>物料</TableHead>
							<TableHead>状态</TableHead>
							<TableHead>包装数量</TableHead>
							<TableHead>审核人</TableHead>
							<TableHead>审核时间</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
								</TableCell>
							</TableRow>
						) : records && records.length > 0 ? (
							records.map((record) => {
								const statusMeta = statusLabelMap[record.status] ?? statusLabelMap.UNLOADED;
								return (
									<TableRow key={record.id}>
										<TableCell>{formatDateTime(record.loadedAt)}</TableCell>
										<TableCell className="font-mono">
											{record.slotCode} ({record.position})
										</TableCell>
										<TableCell className="font-mono">
											{record.materialCode} / {record.lotNo}
										</TableCell>
										<TableCell>
											<Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
										</TableCell>
										<TableCell>{record.packageQty ?? "-"}</TableCell>
										<TableCell>{record.reviewedBy ?? "-"}</TableCell>
										<TableCell>{formatDateTime(record.reviewedAt)}</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
									暂无换料记录
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
