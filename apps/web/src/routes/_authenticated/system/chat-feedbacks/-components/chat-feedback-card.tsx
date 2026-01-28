import { format } from "date-fns";
import { Globe, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ChatFeedbackItem } from "@/hooks/use-chat-feedbacks";

interface ChatFeedbackCardProps {
	item: ChatFeedbackItem;
	onClick?: () => void;
}

export function ChatFeedbackCard({ item, onClick }: ChatFeedbackCardProps) {
	return (
		<Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-muted-foreground" />
					<div className="flex flex-col">
						<span className="text-sm font-medium">{item.user.name}</span>
						<span className="text-xs text-muted-foreground">{item.user.username}</span>
					</div>
				</div>
				<span className="text-xs text-muted-foreground">
					{format(new Date(item.createdAt), "MM-dd HH:mm")}
				</span>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Globe className="h-3 w-3" />
					<code>{item.currentPath}</code>
				</div>

				<div className="space-y-2">
					<div className="rounded-lg bg-muted p-2 text-sm">
						<div className="flex items-center gap-2 mb-1">
							<Badge variant="outline" className="px-1 py-0 text-[10px]">
								用户
							</Badge>
						</div>
						<p className="line-clamp-2">{item.userMessage}</p>
					</div>
					<div className="rounded-lg bg-secondary/30 p-2 text-sm">
						<div className="flex items-center gap-2 mb-1">
							<Badge variant="secondary" className="px-1 py-0 text-[10px]">
								助手
							</Badge>
						</div>
						<p className="line-clamp-2">{item.assistantMessage}</p>
					</div>
				</div>

				{item.feedback && (
					<div className="flex items-start gap-2 pt-2 border-t">
						<MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
						<p className="text-sm italic">{item.feedback}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
