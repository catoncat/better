import { useLocation } from "@tanstack/react-router";
import { Clock, MessageCircle, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatHistory } from "./chat-history";
import { ChatInput } from "./chat-input";
import { type ChatFeedbackPayload, ChatMessages } from "./chat-messages";
import { ChatSuggestions } from "./chat-suggestions";
import { getRouteContext } from "./route-context";
import { useChat } from "./use-chat";
import { useChatHistory } from "./use-chat-history";
import { type SuggestionItem, useSuggestions } from "./use-suggestions";

const DEFAULT_SESSION_TITLE = "新会话";
const BASE_URL = import.meta.env.VITE_SERVER_URL
	? `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, "")}/api`
	: "/api";

export function ChatAssistant() {
	const [isOpen, setIsOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const location = useLocation();
	const currentPath = location.pathname;
	const routeContext = getRouteContext(currentPath);

	const {
		sessions,
		activeSessionId,
		activeSession,
		isReady: isHistoryReady,
		createSession,
		selectSession,
		renameSession,
		deleteSession,
		loadMessages,
		saveMessages,
		updateSessionMeta,
	} = useChatHistory();

	const { messages, isLoading, error, sendMessage, clearMessages, stop, setMessages } = useChat({
		currentPath,
	});

	const lastAssistantMessage = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i -= 1) {
			const message = messages[i];
			if (message?.role === "assistant") {
				return message;
			}
		}
		return null;
	}, [messages]);

	const suggestionReply =
		lastAssistantMessage && !lastAssistantMessage.isStreaming ? lastAssistantMessage.content : null;

	// Fetch page suggestions when chat is open and no messages yet
	const {
		suggestions: pageSuggestions,
		isLoading: pageSuggestionsLoading,
		refresh: refreshPageSuggestions,
	} = useSuggestions({
		currentPath,
		enabled: isOpen && !isHistoryOpen && messages.length === 0,
	});

	// Fetch next-step suggestions based on the latest assistant reply
	const {
		suggestions: replySuggestions,
		isLoading: replySuggestionsLoading,
		refresh: refreshReplySuggestions,
	} = useSuggestions({
		currentPath,
		reply: suggestionReply,
		enabled: isOpen && !isHistoryOpen && !!suggestionReply,
	});

	const handleSend = useCallback(
		async (content: string) => {
			setInputValue("");
			setIsHistoryOpen(false);
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
				setIsHistoryOpen(false);
			}
		},
		[handleSend],
	);

	const handleFeedback = useCallback(
		async (payload: ChatFeedbackPayload) => {
			if (!payload.assistantMessage) return;
			try {
				await fetch(`${BASE_URL}/chat/feedback`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						currentPath,
						sessionId: activeSessionId,
						userMessage: payload.userMessage ?? "",
						assistantMessage: payload.assistantMessage,
						userMessageId: payload.userMessageId,
						assistantMessageId: payload.assistantMessageId,
						feedback: payload.feedback,
					}),
				});
			} catch {
				// Ignore feedback errors to avoid blocking chat UI
			}
		},
		[activeSessionId, currentPath],
	);

	const derivedTitle = useMemo(() => {
		const firstUserMessage = messages.find(
			(message) => message.role === "user" && message.content.trim().length > 0,
		);
		if (!firstUserMessage) return null;
		const trimmed = firstUserMessage.content.trim();
		return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed;
	}, [messages]);

	useEffect(() => {
		if (!isHistoryReady || !activeSessionId) return;
		const storedMessages = loadMessages(activeSessionId);
		setMessages(storedMessages);
	}, [activeSessionId, isHistoryReady, loadMessages, setMessages]);

	useEffect(() => {
		if (!isHistoryReady || !activeSessionId) return;
		saveMessages(activeSessionId, messages);
		updateSessionMeta(activeSessionId, {
			messageCount: messages.length,
			lastPath: currentPath,
		});

		if (derivedTitle && (activeSession?.title === DEFAULT_SESSION_TITLE || !activeSession?.title)) {
			updateSessionMeta(activeSessionId, { title: derivedTitle });
		}
	}, [
		activeSession?.title,
		activeSessionId,
		currentPath,
		derivedTitle,
		isHistoryReady,
		messages,
		saveMessages,
		updateSessionMeta,
	]);

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
								<h2 className="font-semibold">MES 助手</h2>
								<p className="text-muted-foreground text-xs">当前页面：{routeContext.name}</p>
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsHistoryOpen((prev) => !prev)}
									className="size-8"
									title="历史记录"
								>
									<Clock className="size-4" />
								</Button>
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

						{isHistoryOpen ? (
							<ChatHistory
								sessions={sessions}
								activeSessionId={activeSessionId}
								onSelect={(sessionId) => {
									stop();
									selectSession(sessionId);
									setIsHistoryOpen(false);
									setInputValue("");
								}}
								onCreate={() => {
									stop();
									createSession();
									setIsHistoryOpen(false);
									setInputValue("");
								}}
								onRename={renameSession}
								onDelete={deleteSession}
								className="flex-1"
							/>
						) : (
							<>
								{/* Suggestions - show only when no messages */}
								{messages.length === 0 && (
									<ChatSuggestions
										suggestions={pageSuggestions}
										isLoading={pageSuggestionsLoading}
										title="页面建议"
										onSelect={handleSuggestionSelect}
										onRefresh={refreshPageSuggestions}
										className="border-b"
									/>
								)}

								{/* Messages */}
								<ChatMessages messages={messages} className="flex-1" onFeedback={handleFeedback} />

								{/* Suggestions - show after assistant reply */}
								{suggestionReply && (
									<ChatSuggestions
										suggestions={replySuggestions}
										isLoading={replySuggestionsLoading}
										title="下一步建议"
										onSelect={handleSuggestionSelect}
										onRefresh={refreshReplySuggestions}
										className="border-t"
									/>
								)}

								{/* Input */}
								<ChatInput
									onSend={handleSend}
									onStop={stop}
									isLoading={isLoading}
									placeholder={`关于"${routeContext.name}"有什么问题？`}
									value={inputValue}
									onChange={setInputValue}
								/>
							</>
						)}
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
