import { Bot, Loader2, RefreshCw, User } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

export function ChatMarkdown({ content }: { content: string }) {
	return (
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
						const text = Array.isArray(children) ? children.join("") : String(children ?? "");
						return <code className={className}>{linkifyRoutePaths(text)}</code>;
					},
					// Compact list styling
					ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
					ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
					li: ({ children }) => <li className="text-sm">{linkifyRouteChildren(children)}</li>,
					// Compact paragraph
					p: ({ children }) => <p className="my-1">{linkifyRouteChildren(children)}</p>,
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
						<td className="border border-border px-2 py-1">{linkifyRouteChildren(children)}</td>
					),
				}}
			>
				{normalizeRouteLines(content)}
			</Markdown>
		</div>
	);
}

type ChatMessagesProps = {
	messages: ChatMessage[];
	onReload?: () => void;
	className?: string;
};

export type ChatFeedbackPayload = {
	userMessage?: string;
	userMessageId?: string;
	assistantMessage: string;
	assistantMessageId?: string;
	feedback?: string;
};

export function ChatMessages({ messages, onReload, className }: ChatMessagesProps) {
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
		<div
			ref={containerRef}
			className={cn("flex-1 min-h-0 space-y-4 overflow-y-auto p-4", className)}
		>
			{messages.map((message, index) => (
				<MessageBubble
					key={message.id}
					message={message}
					isLast={index === messages.length - 1}
					onReload={onReload}
				/>
			))}
		</div>
	);
}

function MessageBubble({
	message,
	isLast,
	onReload,
}: {
	message: ChatMessage;
	isLast: boolean;
	onReload?: () => void;
}) {
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
			<div className="flex max-w-[80%] flex-col gap-1">
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
							<ChatMarkdown content={message.content} />
						)
					) : message.isStreaming ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
				</div>
				{!isUser && isLast && onReload && !message.isStreaming && (
					<div className="flex px-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-5 rounded-full text-muted-foreground hover:text-foreground"
							onClick={onReload}
							title="重新生成"
						>
							<RefreshCw className="size-3" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

const MESSAGE_SEPARATOR = "\n\n---\n\n";

function buildMessageBlock(items: ChatMessage[]): string {
	return items
		.map((message) => message.content.trim())
		.filter(Boolean)
		.join(MESSAGE_SEPARATOR);
}

type ChatFeedbackDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	messages: ChatMessage[];
	onFeedback?: (payload: ChatFeedbackPayload) => void;
};

export function ChatFeedbackDialog({
	open,
	onOpenChange,
	messages,
	onFeedback,
}: ChatFeedbackDialogProps) {
	const [note, setNote] = useState("");
	const selectableMessages = useMemo(
		() => messages.filter((message) => message.content.trim().length > 0 && !message.isStreaming),
		[messages],
	);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (open) {
			setSelectedIds(new Set(selectableMessages.map((message) => message.id)));
		}
	}, [open, selectableMessages]);

	const selectedMessages = selectableMessages.filter((message) => selectedIds.has(message.id));
	const selectedCount = selectedMessages.length;

	const handleSelectAll = () => {
		setSelectedIds(new Set(selectableMessages.map((message) => message.id)));
	};

	const handleClear = () => {
		setSelectedIds(new Set());
	};

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setNote("");
		}
	};

	const handleSubmit = () => {
		if (!onFeedback || selectedMessages.length === 0) return;

		const userMessages = selectedMessages.filter((message) => message.role === "user");
		const assistantMessages = selectedMessages.filter((message) => message.role === "assistant");
		const feedback = note.trim();

		onFeedback({
			userMessage: buildMessageBlock(userMessages),
			userMessageId: userMessages[0]?.id,
			assistantMessage: buildMessageBlock(assistantMessages),
			assistantMessageId: assistantMessages[0]?.id,
			feedback: feedback ? feedback : undefined,
		});

		handleOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>我要反馈</DialogTitle>
				</DialogHeader>
				<DialogBody className="space-y-4">
					<div className="grid gap-2">
						<Textarea
							id="chat-feedback-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder="描述你的疑问，遇到的问题或建议（可选）"
							rows={4}
						/>
					</div>

					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>
							已选 {selectedCount} / {selectableMessages.length}
						</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleSelectAll}
								disabled={selectableMessages.length === 0}
							>
								全选
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleClear}
								disabled={selectedCount === 0}
							>
								清空
							</Button>
						</div>
					</div>

					<div className="rounded-lg border">
						<div className="max-h-80 overflow-y-auto">
							<div className="divide-y">
								{selectableMessages.map((message, index) => {
									const checkboxId = `chat-feedback-${message.id}`;
									const isChecked = selectedIds.has(message.id);
									const roleLabel = message.role === "user" ? "用户" : "助手";
									const toggleSelection = () => {
										setSelectedIds((prev) => {
											const next = new Set(prev);
											if (next.has(message.id)) {
												next.delete(message.id);
											} else {
												next.add(message.id);
											}
											return next;
										});
									};

									return (
										<div
											key={message.id}
											className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
										>
											<Checkbox
												id={checkboxId}
												checked={isChecked}
												onCheckedChange={(checked) => {
													setSelectedIds((prev) => {
														const next = new Set(prev);
														if (checked === true) {
															next.add(message.id);
														} else {
															next.delete(message.id);
														}
														return next;
													});
												}}
												className="mt-1"
											/>
											{/* biome-ignore lint/a11y/noStaticElementInteractions: Intentionally interactive row for convenience */}
											<div
												className="grid gap-2 w-full min-w-0 cursor-pointer"
												onClick={toggleSelection}
											>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Badge variant={message.role === "user" ? "secondary" : "outline"}>
														{roleLabel}
													</Badge>
													<span>消息 {index + 1}</span>
												</div>
												<div className="text-sm font-normal">
													{message.role === "user" ? (
														<div className="whitespace-pre-wrap text-sm">{message.content}</div>
													) : (
														<ChatMarkdown content={message.content} />
													)}
												</div>
											</div>
										</div>
									);
								})}
								{selectableMessages.length === 0 && (
									<div className="px-4 py-6 text-center text-sm text-muted-foreground">
										暂无可反馈的消息
									</div>
								)}
							</div>
						</div>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
						取消
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={selectedCount === 0 || !onFeedback}
					>
						提交反馈
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
