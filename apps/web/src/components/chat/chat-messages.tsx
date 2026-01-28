import { Bot, Loader2, User } from "lucide-react";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./use-chat";

type ChatMessagesProps = {
	messages: ChatMessage[];
	className?: string;
};

export function ChatMessages({ messages, className }: ChatMessagesProps) {
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
			{messages.map((message) => (
				<MessageBubble key={message.id} message={message} />
			))}
		</div>
	);
}

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";

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
			<div
				className={cn(
					"max-w-[80%] rounded-lg px-3 py-2",
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
										return isInline ? (
											<code className="bg-muted-foreground/20 rounded px-1 py-0.5 text-xs">
												{children}
											</code>
										) : (
											<code className={className}>{children}</code>
										);
									},
									// Compact list styling
									ul: ({ children }) => (
										<ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>
									),
									ol: ({ children }) => (
										<ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>
									),
									li: ({ children }) => <li className="text-sm">{children}</li>,
									// Compact paragraph
									p: ({ children }) => <p className="my-1">{children}</p>,
									// Table styling
									table: ({ children }) => (
										<div className="my-2 overflow-x-auto">
											<table className="min-w-full border-collapse text-xs">{children}</table>
										</div>
									),
									th: ({ children }) => (
										<th className="border border-border bg-muted px-2 py-1 text-left font-medium">
											{children}
										</th>
									),
									td: ({ children }) => (
										<td className="border border-border px-2 py-1">{children}</td>
									),
								}}
							>
								{message.content}
							</Markdown>
						</div>
					)
				) : message.isStreaming ? (
					<Loader2 className="size-4 animate-spin" />
				) : null}
			</div>
		</div>
	);
}
