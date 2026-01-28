import { useLocation } from "@tanstack/react-router";
import { MessageCircle, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { ChatSuggestions } from "./chat-suggestions";
import { getRouteContext } from "./route-context";
import { useChat } from "./use-chat";
import { type SuggestionItem, useSuggestions } from "./use-suggestions";

export function ChatAssistant() {
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const location = useLocation();
	const currentPath = location.pathname;
	const routeContext = getRouteContext(currentPath);

	const { messages, isLoading, error, sendMessage, clearMessages, stop } = useChat({
		currentPath,
	});

	// Fetch suggestions only when chat is open and no messages yet
	const {
		suggestions,
		isLoading: suggestionsLoading,
		refresh: refreshSuggestions,
	} = useSuggestions({
		currentPath,
		enabled: isOpen && messages.length === 0,
	});

	const handleSend = useCallback(
		async (content: string) => {
			setInputValue("");
			await sendMessage(content);
		},
		[sendMessage],
	);

	const handleSuggestionSelect = useCallback(
		(suggestion: SuggestionItem) => {
			if (suggestion.action === "send") {
				// Direct send
				handleSend(suggestion.question);
			} else {
				// Fill input for user to modify
				setInputValue(suggestion.question);
			}
		},
		[handleSend],
	);

	// Render in a portal to ensure highest z-index (above all Dialogs)
	const chatContent = (
		<div data-chat-assistant-root className="contents">
			{/* Floating button - always visible when chat is closed */}
			<Button
				onClick={() => setIsOpen(true)}
				size="lg"
				className={cn(
					"fixed right-6 bottom-6 z-[9999] size-14 rounded-full shadow-lg transition-transform hover:scale-105",
					isOpen && "scale-0 pointer-events-none",
				)}
			>
				<MessageCircle className="size-6" />
			</Button>

			{/* Chat panel - slides in from right */}
			{isOpen && (
				<>
					{/* Backdrop */}
					<button
						type="button"
						aria-label="关闭聊天"
						className="fixed inset-0 z-[9998] cursor-default bg-black/20"
						onClick={() => setIsOpen(false)}
					/>

					{/* Chat panel */}
					<div className="fixed top-0 right-0 z-[9999] flex h-full w-full flex-col bg-background shadow-xl sm:max-w-md animate-in slide-in-from-right duration-300">
						{/* Header */}
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="flex-1">
								<h2 className="font-semibold">AI 助手</h2>
								<p className="text-muted-foreground text-xs">当前页面：{routeContext.name}</p>
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
						</div>

						{/* Error display */}
						{error && (
							<div className="mx-4 mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{error}
							</div>
						)}

						{/* Suggestions - show only when no messages */}
						{messages.length === 0 && (
							<ChatSuggestions
								suggestions={suggestions}
								isLoading={suggestionsLoading}
								onSelect={handleSuggestionSelect}
								onRefresh={refreshSuggestions}
								className="border-b"
							/>
						)}

						{/* Messages */}
						<ChatMessages messages={messages} className="flex-1" />

						{/* Input */}
						<ChatInput
							onSend={handleSend}
							onStop={stop}
							isLoading={isLoading}
							placeholder={`关于"${routeContext.name}"有什么问题？`}
							value={inputValue}
							onChange={setInputValue}
						/>
					</div>
				</>
			)}
		</div>
	);

	// Use portal to render at document body level (above all other content)
	if (typeof document !== "undefined") {
		return createPortal(chatContent, document.body);
	}

	return chatContent;
}
