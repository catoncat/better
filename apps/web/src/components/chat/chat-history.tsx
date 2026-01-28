import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSession } from "./use-chat-history";

type ChatHistoryProps = {
	sessions: ChatSession[];
	activeSessionId: string | null;
	onSelect: (sessionId: string) => void;
	onCreate: () => void;
	onRename: (sessionId: string, title: string) => void;
	onDelete: (sessionId: string) => void;
	className?: string;
};

type SessionGroup = {
	label: string;
	sessions: ChatSession[];
};

function groupSessionsByDate(sessions: ChatSession[]): SessionGroup[] {
	const now = new Date();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(todayStart.getDate() - 1);

	const groups: SessionGroup[] = [
		{ label: "今天", sessions: [] },
		{ label: "昨天", sessions: [] },
		{ label: "更早", sessions: [] },
	];

	for (const session of sessions) {
		const updatedAt = new Date(session.updatedAt);
		if (updatedAt >= todayStart) {
			groups[0].sessions.push(session);
		} else if (updatedAt >= yesterdayStart) {
			groups[1].sessions.push(session);
		} else {
			groups[2].sessions.push(session);
		}
	}

	return groups.filter((group) => group.sessions.length > 0);
}

function formatTime(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ChatHistory({
	sessions,
	activeSessionId,
	onSelect,
	onCreate,
	onRename,
	onDelete,
	className,
}: ChatHistoryProps) {
	const groups = groupSessionsByDate(sessions);

	return (
		<div className={cn("flex flex-1 flex-col gap-4 p-4", className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium">
					<Clock className="size-4" />
					<span>历史记录</span>
				</div>
				<Button size="sm" variant="outline" onClick={onCreate} className="gap-1">
					<Plus className="size-3" />
					新建会话
				</Button>
			</div>

			{groups.length === 0 ? (
				<div className="text-muted-foreground text-sm">暂无历史会话</div>
			) : (
				<div className="flex flex-col gap-4">
					{groups.map((group) => (
						<div key={group.label} className="space-y-2">
							<div className="text-muted-foreground text-xs">{group.label}</div>
							<div className="space-y-2">
								{group.sessions.map((session) => (
									<div
										key={session.id}
										className={cn(
											"flex items-center justify-between rounded-md border px-3 py-2",
											session.id === activeSessionId
												? "border-primary/60 bg-primary/5"
												: "border-border",
										)}
									>
										<button
											type="button"
											onClick={() => onSelect(session.id)}
											className="flex min-w-0 flex-1 flex-col items-start text-left"
										>
											<span className="max-w-full truncate text-sm font-medium">
												{session.title}
											</span>
											<span className="text-muted-foreground text-xs">
												{formatTime(session.updatedAt)} · {session.messageCount} 条
											</span>
										</button>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="size-7"
												onClick={() => {
													const nextTitle = window.prompt("重命名会话", session.title);
													if (nextTitle !== null) {
														onRename(session.id, nextTitle);
													}
												}}
												title="重命名"
											>
												<Pencil className="size-3" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="size-7 text-destructive"
												onClick={() => {
													if (window.confirm("确认删除该会话？")) {
														onDelete(session.id);
													}
												}}
												title="删除"
											>
												<Trash2 className="size-3" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
