import { useCallback, useRef, useState } from "react";

export type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	isStreaming?: boolean;
};

type UseChatOptions = {
	currentPath?: string;
};

type UseChatReturn = {
	messages: ChatMessage[];
	isLoading: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
	stop: () => void;
};

const BASE_URL = import.meta.env.VITE_SERVER_URL
	? `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, "")}/api`
	: "/api";

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Custom hook for managing chat state and SSE streaming
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading) return;

			setError(null);

			// Add user message
			const userMessage: ChatMessage = {
				id: generateId(),
				role: "user",
				content: content.trim(),
			};

			// Create placeholder for assistant response
			const assistantMessage: ChatMessage = {
				id: generateId(),
				role: "assistant",
				content: "",
				isStreaming: true,
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);
			setIsLoading(true);

			// Create abort controller for cancellation
			abortControllerRef.current = new AbortController();

			try {
				// Build messages for API (only role and content)
				const apiMessages = [...messages, userMessage].map((m) => ({
					role: m.role,
					content: m.content,
				}));

				const response = await fetch(`${BASE_URL}/chat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						messages: apiMessages,
						currentPath: options.currentPath,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error?.message || `请求失败: ${response.status}`);
				}

				// Handle SSE stream
				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error("无法读取响应流");
				}

				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();

					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					// Process SSE events
					const lines = buffer.split("\n");
					buffer = lines.pop() || ""; // Keep incomplete line in buffer

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const data = line.slice(6);
							try {
								const parsed = JSON.parse(data);

								if (parsed.content) {
									// Append content to assistant message
									setMessages((prev) =>
										prev.map((m) =>
											m.id === assistantMessage.id
												? { ...m, content: m.content + parsed.content }
												: m,
										),
									);
								}

								if (parsed.done) {
									// Mark streaming as complete
									setMessages((prev) =>
										prev.map((m) =>
											m.id === assistantMessage.id ? { ...m, isStreaming: false } : m,
										),
									);
								}

								if (parsed.error) {
									throw new Error(parsed.message || "生成回复时发生错误");
								}
							} catch (e) {
								// Ignore JSON parse errors for incomplete data
								if (e instanceof SyntaxError) continue;
								throw e;
							}
						}
					}
				}

				// Ensure streaming is marked as complete
				setMessages((prev) =>
					prev.map((m) => (m.id === assistantMessage.id ? { ...m, isStreaming: false } : m)),
				);
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					// User cancelled, just mark as complete
					setMessages((prev) =>
						prev.map((m) => (m.id === assistantMessage.id ? { ...m, isStreaming: false } : m)),
					);
				} else {
					const errorMessage = err instanceof Error ? err.message : "发送消息失败";
					setError(errorMessage);

					// Remove the empty assistant message on error
					setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id));
				}
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[isLoading, messages, options.currentPath],
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setError(null);
	}, []);

	const stop = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		clearMessages,
		stop,
	};
}
