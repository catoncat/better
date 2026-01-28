import { Loader2, MessageSquareText, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestionItem } from "./use-suggestions";

type ChatSuggestionsProps = {
	suggestions: SuggestionItem[];
	isLoading: boolean;
	onSelect: (suggestion: SuggestionItem) => void;
	onRefresh?: () => void;
	onFeedback?: () => void;
	className?: string;
};

export function ChatSuggestions({
	suggestions,
	isLoading,
	onSelect,
	onRefresh,
	onFeedback,
	className,
}: ChatSuggestionsProps) {
	return (
		<div className={cn("px-3 py-1.5", className)}>
			<div className="flex flex-wrap gap-1.5 items-center">
				{suggestions.length === 0 && onRefresh && !isLoading && (
					<button
						type="button"
						onClick={onRefresh}
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer",
							"bg-primary/5 border-primary/30 text-primary hover:bg-primary/10",
							"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
						)}
					>
						<Sparkles className="size-3" />
						<span>获取 AI 建议...</span>
					</button>
				)}

				{isLoading && suggestions.length === 0 && (
					<div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground">
						<Loader2 className="size-3 animate-spin" />
						<span>正在生成建议...</span>
					</div>
				)}

				{suggestions.map((suggestion, index) => (
					<button
						type="button"
						key={`${suggestion.question}-${index}`}
						onClick={() => onSelect(suggestion)}
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer",
							"bg-background hover:bg-accent hover:text-accent-foreground",
							"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
							suggestion.action === "send" ? "border-primary/30 bg-primary/5" : "border-border",
						)}
					>
						<span className="max-w-[200px] truncate">{suggestion.question}</span>
					</button>
				))}
				{onFeedback && (
					<Button
						variant="ghost"
						size="icon"
						className="size-6 rounded-full text-muted-foreground hover:text-foreground"
						onClick={onFeedback}
						title="我要反馈"
					>
						<MessageSquareText className="size-3.5" />
					</Button>
				)}
				{onRefresh && (
					<Button
						variant="ghost"
						size="icon"
						className="size-6 rounded-full text-muted-foreground hover:text-foreground"
						onClick={onRefresh}
						title="刷新建议"
						disabled={isLoading}
					>
						<RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
					</Button>
				)}
			</div>
		</div>
	);
}
