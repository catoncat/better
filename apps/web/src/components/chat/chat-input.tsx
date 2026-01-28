import { Loader2, Send, Square } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatInputProps = {
	onSend: (message: string) => void;
	onStop?: () => void;
	isLoading?: boolean;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
};

export function ChatInput({
	onSend,
	onStop,
	isLoading = false,
	disabled = false,
	placeholder = "输入消息...",
	className,
}: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSend = () => {
		if (value.trim() && !disabled && !isLoading) {
			onSend(value.trim());
			setValue("");

			// Reset textarea height
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		// Send on Enter (without Shift)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleInput = () => {
		// Auto-resize textarea
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
		}
	};

	return (
		<div className={cn("border-t bg-background p-4", className)}>
			<div className="flex items-end gap-2">
				<Textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onInput={handleInput}
					placeholder={placeholder}
					disabled={disabled}
					className="min-h-[40px] max-h-[120px] resize-none"
					rows={1}
				/>
				{isLoading ? (
					<Button variant="destructive" size="icon" onClick={onStop} className="shrink-0">
						<Square className="size-4" />
					</Button>
				) : (
					<Button
						size="icon"
						onClick={handleSend}
						disabled={!value.trim() || disabled}
						className="shrink-0"
					>
						{disabled ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
					</Button>
				)}
			</div>
			<p className="text-muted-foreground mt-1.5 text-xs">按 Enter 发送，Shift + Enter 换行</p>
		</div>
	);
}
