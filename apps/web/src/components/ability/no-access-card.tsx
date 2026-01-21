import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NoAccessCardProps = {
	title?: string;
	description?: string;
	className?: string;
};

export function NoAccessCard({
	title = "无权限查看",
	description = "请联系管理员配置权限。",
	className,
}: NoAccessCardProps) {
	return (
		<Card className={cn("border-dashed", className)}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ShieldAlert className="h-4 w-4 text-muted-foreground" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);
}
