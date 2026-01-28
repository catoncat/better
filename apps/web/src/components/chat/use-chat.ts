import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react";

export type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	isStreaming?: boolean;
};

type UseChatOptions = {
	currentPath?: string;
	initialMessages?: ChatMessage[];
};

type UseChatReturn = {
	messages: ChatMessage[];
	isLoading: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
	stop: () => void;
	setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
	reload: () => Promise<void>;
};

const BASE_URL = import.meta.env.VITE_SERVER_URL
	? `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, "")}/api`
	: "/api";

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Custom hook for managing chat state and SSE streaming
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>(() => options.initialMessages ?? []);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const stop = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	const fetchAndStream = useCallback(
		async (apiMessages: { role: string; content: string }[], assistantId: string) => {
			abortControllerRef.current = new AbortController();

			try {
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

					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const data = line.slice(6);
							try {
								const parsed = JSON.parse(data);

								if (parsed.content) {
									setMessages((prev) =>
										prev.map((m) =>
											m.id === assistantId ? { ...m, content: m.content + parsed.content } : m,
										),
									);
								}

								if (parsed.done) {
									setMessages((prev) =>
										prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
									);
								}

								if (parsed.error) {
									throw new Error(parsed.message || "生成回复时发生错误");
								}
							} catch (e) {
								if (e instanceof SyntaxError) continue;
								throw e;
							}
						}
					}
				}

				setMessages((prev) =>
					prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
				);
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					setMessages((prev) =>
						prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
					);
				} else {
					const errorMessage = err instanceof Error ? err.message : "发送消息失败";
					setError(errorMessage);
					setMessages((prev) => prev.filter((m) => m.id !== assistantId));
				}
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[options.currentPath],
	);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading) return;

			setError(null);

			const userMessage: ChatMessage = {
				id: generateId(),
				role: "user",
				content: content.trim(),
			};

			const assistantMessage: ChatMessage = {
				id: generateId(),
				role: "assistant",
				content: "",
				isStreaming: true,
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);
			setIsLoading(true);

			const apiMessages = [...messages, userMessage].map((m) => ({
				role: m.role,
				content: m.content,
			}));

			await fetchAndStream(apiMessages, assistantMessage.id);
		},
		[isLoading, messages, fetchAndStream],
	);

	const reload = useCallback(async () => {
		if (isLoading || messages.length === 0) return;

		const lastUserIndex = messages.reduce(
			(acc, msg, index) => (msg.role === "user" ? index : acc),
			-1,
		);

		if (lastUserIndex === -1) return;

		const lastUserMessage = messages[lastUserIndex];
		const history = messages.slice(0, lastUserIndex);

		setError(null);
		setIsLoading(true);

		const assistantMessage: ChatMessage = {
			id: generateId(),
			role: "assistant",
			content: "",
			isStreaming: true,
		};

		setMessages([...history, lastUserMessage, assistantMessage]);

		const apiMessages = [...history, lastUserMessage].map((m) => ({
			role: m.role,
			content: m.content,
		}));

		await fetchAndStream(apiMessages, assistantMessage.id);
	}, [isLoading, messages, fetchAndStream]);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setError(null);
	}, []);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		clearMessages,
		stop,
		setMessages,
		reload,
	};
}
