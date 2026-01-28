import { Bot, Loader2, MessageSquareText, User } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./use-chat";

const ROUTE_PATH_REGEX = /\/(?:(?:mes)|(?:system))(?:\/[A-Za-z0-9._-]+)+/g;

function linkifyRoutePaths(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(ROUTE_PATH_REGEX)) {
		const path = match[0];
		const index = match.index ?? 0;
		if (index > lastIndex) {
			nodes.push(text.slice(lastIndex, index));
		}
		nodes.push(
			<a
				key={`${path}-${index}`}
				href={path}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary underline underline-offset-2"
			>
				{path}
			</a>,
		);
		lastIndex = index + path.length;
	}

	if (lastIndex < text.length) {
		nodes.push(text.slice(lastIndex));
	}

	return nodes.length > 0 ? nodes : [text];
}

function hasRoutePath(text: string): boolean {
	ROUTE_PATH_REGEX.lastIndex = 0;
	return ROUTE_PATH_REGEX.test(text);
}

function normalizeRouteLines(source: string): string {
	let result = "";
	let inCodeBlock = false;
	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i] ?? "";
		if (line.trim().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			result += line;
			result += i === lines.length - 1 ? "" : "\n";
			continue;
		}

		if (!inCodeBlock && hasRoutePath(line) && /^\s{4,}|\t/.test(line)) {
			console.log("匹配路径");
			line = line.replace(/^\s+/, "");
		}

		result += line;
		result += i === lines.length - 1 ? "" : "\n";
	}

	return result;
}

function linkifyRouteChildren(children: ReactNode): ReactNode {
	if (typeof children === "string") {
		return linkifyRoutePaths(children);
	}
	if (Array.isArray(children)) {
		return children.flatMap((child) => {
			if (typeof child === "string") {
				return linkifyRoutePaths(child);
			}
			return child;
		});
	}
	return children;
}

type ChatMessagesProps = {
	messages: ChatMessage[];
	className?: string;
	onFeedback?: (payload: ChatFeedbackPayload) => void;
};

export type ChatFeedbackPayload = {
	userMessage?: string;
	userMessageId?: string;
	assistantMessage: string;
	assistantMessageId: string;
	feedback?: string;
};

export function ChatMessages({ messages, className, onFeedback }: ChatMessagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom on every render (when messages change)
	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	});

	if (messages.length === 0) {
		return (
			<div className={cn("flex flex-1 items-center justify-center p-4", className)}>
				<div className="text-muted-foreground text-center text-sm">
					<Bot className="mx-auto mb-2 size-8 opacity-50" />
					<p>你好！我是 MES 助手。</p>
					<p className="mt-1">有什么可以帮助你的吗？</p>
				</div>
			</div>
		);
	}

	return (
		<div ref={containerRef} className={cn("flex-1 space-y-4 overflow-y-auto p-4", className)}>
			{messages.map((message, index) => (
				<MessageBubble
					key={message.id}
					message={message}
					previousMessages={messages.slice(0, index)}
					onFeedback={onFeedback}
				/>
			))}
		</div>
	);
}

function getPreviousUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		if (message?.role === "user") return message;
	}
	return undefined;
}

function MessageBubble({
	message,
	previousMessages,
	onFeedback,
}: {
	message: ChatMessage;
	previousMessages: ChatMessage[];
	onFeedback?: (payload: ChatFeedbackPayload) => void;
}) {
	const isUser = message.role === "user";
	const previousUserMessage = isUser ? undefined : getPreviousUserMessage(previousMessages);

	return (
		<div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
			{/* Avatar */}
			<div
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full",
					isUser ? "bg-primary text-primary-foreground" : "bg-muted",
				)}
			>
				{isUser ? <User className="size-4" /> : <Bot className="size-4" />}
			</div>

			{/* Message bubble */}
			<div className="flex max-w-[80%] flex-col gap-2">
				<div
					className={cn(
						"rounded-lg px-3 py-2",
						isUser ? "bg-primary text-primary-foreground" : "bg-muted",
					)}
				>
					{message.content ? (
						isUser ? (
							<div className="whitespace-pre-wrap text-sm">{message.content}</div>
						) : (
							<div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
								<Markdown
									remarkPlugins={[remarkGfm]}
									components={{
										// Custom link styling
										a: ({ children, href }) => (
											<a
												href={href}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{children}
											</a>
										),
										// Compact code styling
										code: ({ children, className }) => {
											const isInline = !className;
											if (isInline) {
												return (
													<code className="bg-muted-foreground/20 rounded px-1 py-0.5 text-xs">
														{linkifyRouteChildren(children)}
													</code>
												);
											}
											const text = Array.isArray(children)
												? children.join("")
												: String(children ?? "");
											return <code className={className}>{linkifyRoutePaths(text)}</code>;
										},
										// Compact list styling
										ul: ({ children }) => (
											<ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>
										),
										ol: ({ children }) => (
											<ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>
										),
										li: ({ children }) => (
											<li className="text-sm">{linkifyRouteChildren(children)}</li>
										),
										// Compact paragraph
										p: ({ children }) => (
											<p className="my-1">{linkifyRouteChildren(children)}</p>
										),
										// Table styling
										table: ({ children }) => (
											<div className="my-2 overflow-x-auto">
												<table className="min-w-full border-collapse text-xs">{children}</table>
											</div>
										),
										th: ({ children }) => (
											<th className="border border-border bg-muted px-2 py-1 text-left font-medium">
												{linkifyRouteChildren(children)}
											</th>
										),
										td: ({ children }) => (
											<td className="border border-border px-2 py-1">
												{linkifyRouteChildren(children)}
											</td>
										),
									}}
								>
									{normalizeRouteLines(message.content)}
								</Markdown>
							</div>
						)
					) : message.isStreaming ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
				</div>

				{!isUser && !message.isStreaming && onFeedback && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 justify-start gap-1 px-2 text-xs text-muted-foreground"
						onClick={() => {
							const feedback = window.prompt("请描述你的问题或补充说明（可选）");
							if (feedback === null) return;
							onFeedback({
								userMessage: previousUserMessage?.content,
								userMessageId: previousUserMessage?.id,
								assistantMessage: message.content,
								assistantMessageId: message.id,
								feedback: feedback.trim() ? feedback.trim() : undefined,
							});
						}}
					>
						<MessageSquareText className="size-3" />
						反馈这个回答
					</Button>
				)}
			</div>
		</div>
	);
}
