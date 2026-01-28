import { format } from "date-fns";
import { Globe, User } from "lucide-react";
import { ChatMarkdown } from "@/components/chat/chat-messages";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ChatFeedbackItem } from "@/hooks/use-chat-feedbacks";

interface ChatFeedbackDialogProps {
	item: ChatFeedbackItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChatFeedbackDialog({ item, open, onOpenChange }: ChatFeedbackDialogProps) {
	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<DialogTitle>反馈详情</DialogTitle>
							<DialogDescription>
								提交时间: {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm:ss")}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="flex items-center gap-6 text-sm text-muted-foreground border-b pb-4">
					<div className="flex items-center gap-2">
						<User className="h-4 w-4" />
						<span>{item.user.name}</span>
						<span className="text-xs">({item.user.username})</span>
					</div>
					{item.currentPath && (
						<div className="flex items-center gap-2">
							<Globe className="h-4 w-4" />
							<code className="bg-muted px-1 py-0.5 rounded text-xs">{item.currentPath}</code>
						</div>
					)}
				</div>

				<div className="flex-1 overflow-y-auto -mx-6 px-6">
					<div className="space-y-6 py-4">
						{item.feedback && (
							<div className="space-y-2">
								<h3 className="text-sm font-medium text-primary">用户反馈</h3>
								<div className="rounded-lg border p-4 text-sm italic bg-background">
									{item.feedback}
								</div>
							</div>
						)}

						<div className="space-y-2">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Badge variant="outline">用户提问</Badge>
							</h3>
							<div className="rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
								{item.userMessage}
							</div>
						</div>

						<div className="space-y-2">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Badge variant="secondary">AI 回复</Badge>
							</h3>
							<div className="rounded-lg bg-secondary/30 p-4 text-sm leading-relaxed">
								<ChatMarkdown content={item.assistantMessage} />
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
