import { useLocation } from "@tanstack/react-router";
import { MessageCircle, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { getRouteContext } from "./route-context";
import { useChat } from "./use-chat";

export function ChatAssistant() {
	const [isOpen, setIsOpen] = useState(false);
	const location = useLocation();
	const currentPath = location.pathname;
	const routeContext = getRouteContext(currentPath);

	const { messages, isLoading, error, sendMessage, clearMessages, stop } = useChat({
		currentPath,
	});

	const handleSend = useCallback(
		async (content: string) => {
			await sendMessage(content);
		},
		[sendMessage],
	);

	return (
		<>
			{/* Floating button */}
			<Button
				onClick={() => setIsOpen(true)}
				size="lg"
				className={cn(
					"fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-lg transition-transform hover:scale-105",
					isOpen && "scale-0",
				)}
			>
				<MessageCircle className="size-6" />
			</Button>

			{/* Chat sheet */}
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
					<SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
						<div className="flex-1">
							<SheetTitle className="text-left">AI 助手</SheetTitle>
							<p className="text-muted-foreground text-left text-xs">
								当前页面：{routeContext.name}
							</p>
						</div>
						<div className="flex items-center gap-1">
							{messages.length > 0 && (
								<Button
									variant="ghost"
									size="icon"
									onClick={clearMessages}
									className="size-8"
									title="清空对话"
								>
									<Trash2 className="size-4" />
								</Button>
							)}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsOpen(false)}
								className="size-8"
							>
								<X className="size-4" />
							</Button>
						</div>
					</SheetHeader>

					{/* Error display */}
					{error && (
						<div className="mx-4 mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</div>
					)}

					{/* Messages */}
					<ChatMessages messages={messages} className="flex-1" />

					{/* Input */}
					<ChatInput
						onSend={handleSend}
						onStop={stop}
						isLoading={isLoading}
						placeholder={`关于"${routeContext.name}"有什么问题？`}
					/>
				</SheetContent>
			</Sheet>
		</>
	);
}
