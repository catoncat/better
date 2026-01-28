import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChatFeedbackItem } from "@/hooks/use-chat-feedbacks";

interface GetColumnsProps {
	onView: (item: ChatFeedbackItem) => void;
}

export const getChatFeedbackColumns = ({
	onView,
}: GetColumnsProps): ColumnDef<ChatFeedbackItem>[] => [
	{
		accessorKey: "createdAt",
		header: "时间",
		cell: ({ row }) => format(new Date(row.original.createdAt), "yyyy-MM-dd HH:mm:ss"),
	},
	{
		accessorKey: "user.name",
		header: "用户",
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="font-medium">{row.original.user.name}</span>
				<span className="text-xs text-muted-foreground">{row.original.user.username}</span>
			</div>
		),
	},
	{
		accessorKey: "currentPath",
		header: "页面路径",
		cell: ({ row }) => <code className="text-xs">{row.original.currentPath}</code>,
	},
	{
		accessorKey: "feedback",
		header: "反馈内容",
		cell: ({ row }) => (
			<div className="max-w-[300px] truncate" title={row.original.feedback || ""}>
				{row.original.feedback || <span className="text-muted-foreground italic">无详细内容</span>}
			</div>
		),
	},
	{
		id: "messages",
		header: "对话内容",
		cell: ({ row }) => (
			<div className="flex flex-col gap-1 text-xs">
				<div className="flex gap-1">
					<Badge variant="outline" className="h-4 px-1 text-[10px]">
						用户
					</Badge>
					<span className="truncate max-w-[200px]">{row.original.userMessage}</span>
				</div>
				<div className="flex gap-1">
					<Badge variant="secondary" className="h-4 px-1 text-[10px]">
						助手
					</Badge>
					<span className="truncate max-w-[200px]">{row.original.assistantMessage}</span>
				</div>
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => (
			<div className="flex justify-end">
				<Button variant="ghost" size="icon" onClick={() => onView(row.original)} title="查看详情">
					<Eye className="h-4 w-4" />
					<span className="sr-only">查看详情</span>
				</Button>
			</div>
		),
	},
];
