import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalibrationRecordItem {
	id: string;
	performedAt: string | Date;
	calibrationType: string;
	result?: string | null;
	certificateNo?: string | null;
	providerName?: string | null;
	nextCalibrationDate?: string | Date | null;
	instrument: {
		id: string;
		instrumentNo: string;
		model?: string | null;
		manufacturer?: string | null;
		department?: string | null;
	};
}

interface CalibrationCardProps {
	record: CalibrationRecordItem;
}

export function CalibrationCard({ record }: CalibrationCardProps) {
	const resultConfig = {
		pass: { label: "合格", variant: "default" as const },
		fail: { label: "不合格", variant: "destructive" as const },
		pending: { label: "待确认", variant: "secondary" as const },
	};

	const result = record.result
		? resultConfig[record.result as keyof typeof resultConfig]
		: { label: "待确认", variant: "outline" as const };

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					{record.instrument?.instrumentNo ?? "未标注编号"}
				</CardTitle>
				<div className="flex items-center gap-1">
					<Badge variant={record.calibrationType === "external" ? "default" : "secondary"}>
						{record.calibrationType === "external" ? "外校" : "内校"}
					</Badge>
					<Badge variant={result.variant}>{result.label}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-sm text-muted-foreground mb-2">
					{[record.instrument?.model, record.instrument?.manufacturer]
						.filter(Boolean)
						.join(" · ") || "—"}
				</div>
				<div className="grid gap-1.5 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">校准日期:</span>
						<span>{format(new Date(record.performedAt), "yyyy-MM-dd")}</span>
					</div>
					{record.nextCalibrationDate && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">下次校准:</span>
							<span>{format(new Date(record.nextCalibrationDate), "yyyy-MM-dd")}</span>
						</div>
					)}
					{record.certificateNo && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">证书号:</span>
							<span>{record.certificateNo}</span>
						</div>
					)}
					{record.providerName && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">机构:</span>
							<span>{record.providerName}</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
