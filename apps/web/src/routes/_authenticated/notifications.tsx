import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format, isToday, isYesterday } from "date-fns";
import { Bell, Check, ChevronRight, MailOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
	useDeleteNotification,
	useMarkAllAsRead,
	useMarkAsRead,
	useNotifications,
} from "@/hooks/use-notifications";
import type { client } from "@/lib/eden";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
	component: NotificationsPage,
});

type NotificationsResponse = Awaited<ReturnType<typeof client.api.notifications.get>>["data"];
type NotificationItem = NonNullable<NotificationsResponse>["items"][number];
type NotificationData = {
	link?: { url?: string };
	entityType?: string;
	entityId?: string;
} & Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

function NotificationsPage() {
	const [activeTab, setActiveTab] = useState<string>("all");
	const status = activeTab === "unread" ? "unread" : undefined;

	const { data, isLoading } = useNotifications({
		page: 1,
		limit: 50,
		status,
	});

	const markAllReadMutation = useMarkAllAsRead();
	const unreadCount = data?.items.filter((item) => item.status === "unread").length ?? 0;

	return (
		<div className="max-w-3xl space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">通知中心</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{unreadCount > 0 ? `${unreadCount} 条未读消息` : "暂无未读消息"}
					</p>
				</div>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								onClick={() => markAllReadMutation.mutate()}
								disabled={markAllReadMutation.isPending || unreadCount === 0}
							>
								<MailOpen className="mr-2 h-4 w-4" />
								全部已读
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>将所有通知标记为已读</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="h-9">
					<TabsTrigger value="all" className="text-sm">
						全部
					</TabsTrigger>
					<TabsTrigger value="unread" className="text-sm">
						未读
						{unreadCount > 0 && (
							<span className="ml-1.5 text-xs bg-foreground/10 px-1.5 py-0.5 rounded-full">
								{unreadCount}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value={activeTab} className="mt-4">
					<NotificationContent isLoading={isLoading} items={data?.items || []} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function NotificationContent({
	isLoading,
	items,
}: {
	isLoading: boolean;
	items: NotificationItem[];
}) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{[1, 2, 3].map((i) => (
					<div key={i} className="p-4 border rounded-lg animate-pulse">
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 bg-muted rounded-md" />
							<div className="flex-1 space-y-2">
								<div className="h-4 w-1/3 bg-muted rounded" />
								<div className="h-3 w-2/3 bg-muted rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
					<Bell className="h-6 w-6 text-muted-foreground" />
				</div>
				<p className="text-sm text-muted-foreground">暂无通知</p>
			</div>
		);
	}

	// Group by date
	const grouped = items.reduce<Record<string, NotificationItem[]>>((acc, item) => {
		const date = new Date(item.createdAt);
		let key: string;
		if (isToday(date)) key = "今天";
		else if (isYesterday(date)) key = "昨天";
		else key = format(date, "MM月dd日");

		if (!acc[key]) acc[key] = [];
		acc[key].push(item);
		return acc;
	}, {});

	const orderedKeys = [
		"今天",
		"昨天",
		...Object.keys(grouped)
			.filter((k) => k !== "今天" && k !== "昨天")
			.sort()
			.reverse(),
	].filter((k) => grouped[k]);

	return (
		<div className="space-y-6">
			{orderedKeys.map((dateKey) => (
				<div key={dateKey}>
					<div className="text-sm font-medium text-muted-foreground mb-2">{dateKey}</div>
					<div className="space-y-2">
						{(grouped[dateKey] ?? []).map((item) => (
							<NotificationCard key={item.id} item={item} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// Type icon mapping
const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
	system: { icon: Bell, label: "系统" },
};

function NotificationCard({ item }: { item: NotificationItem }) {
	const navigate = useNavigate();
	const markReadMutation = useMarkAsRead();
	const deleteMutation = useDeleteNotification();

	const isUnread = item.status === "unread";
	const data = isRecord(item.data) ? (item.data as NotificationData) : null;

	// Get type config
	const config = typeConfig[item.type] || typeConfig.system;
	const TypeIcon = config.icon;

	// Navigation link
	const getLink = () => {
		if (data?.link?.url) return data.link.url;
		if (data?.entityType === "instrument" && data?.entityId) {
			return `/instruments/${data.entityId}`;
		}
		return null;
	};

	const link = getLink();

	// Extract main message (first line or full message if short)
	const mainMessage = (() => {
		if (!item.message) return null;
		const lines = item.message.split("\n").filter(Boolean);
		// Skip lines that are just metadata we're already showing
		const contentLines = lines.filter(
			(line: string) =>
				!line.startsWith("设备：") &&
				!line.startsWith("任务编号：") &&
				!line.startsWith("申请编号："),
		);
		return contentLines.length > 0 ? contentLines.join(" ") : null;
	})();

	const handleClick = () => {
		if (link) {
			if (isUnread) {
				markReadMutation.mutate(item.id);
			}
			navigate({ to: link });
		}
	};

	const handleMarkRead = (e: React.MouseEvent) => {
		e.stopPropagation();
		markReadMutation.mutate(item.id);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm("确定删除此通知？")) {
			deleteMutation.mutate(item.id);
		}
	};

	return (
		<div
			className={cn(
				"group relative flex items-start gap-3 p-3 rounded-lg border transition-colors",
				isUnread ? "bg-background border-border" : "bg-muted/30 border-transparent",
			)}
		>
			{/* Unread indicator dot */}
			{isUnread && (
				<div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground" />
			)}

			{/* Icon */}
			<div
				className={cn(
					"flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
					isUnread ? "bg-foreground/5" : "bg-muted",
				)}
			>
				<TypeIcon
					className={cn("h-4 w-4", isUnread ? "text-foreground" : "text-muted-foreground")}
				/>
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0 space-y-1.5">
				{/* Title row */}
				<div className="flex items-start justify-between gap-2">
					<span
						className={cn(
							"text-sm leading-tight",
							isUnread ? "font-medium text-foreground" : "text-muted-foreground",
						)}
					>
						{item.title}
					</span>
					<span className="text-xs text-muted-foreground tabular-nums shrink-0">
						{format(new Date(item.createdAt), "HH:mm")}
					</span>
				</div>

				{/* Message */}
				{mainMessage && (
					<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
						{mainMessage}
					</p>
				)}

				{/* Actions row */}
				<div className="flex items-center gap-2 pt-1">
					{link && (
						<Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleClick}>
							查看详情
							<ChevronRight className="h-3 w-3 ml-0.5" />
						</Button>
					)}
					<div className="flex-1" />
					{isUnread && (
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
							onClick={handleMarkRead}
						>
							<Check className="h-3 w-3 mr-1" />
							已读
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
						onClick={handleDelete}
					>
						<Trash2 className="h-3 w-3 mr-1" />
						删除
					</Button>
				</div>
			</div>
		</div>
	);
}
