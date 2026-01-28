import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestionItem } from "./use-suggestions";

type ChatSuggestionsProps = {
	suggestions: SuggestionItem[];
	isLoading: boolean;
	title?: string;
	onSelect: (suggestion: SuggestionItem) => void;
	onRefresh?: () => void;
	className?: string;
};

export function ChatSuggestions({
	suggestions,
	isLoading,
	title = "建议问题",
	onSelect,
	onRefresh,
	className,
}: ChatSuggestionsProps) {
	if (isLoading) {
		return (
			<div className={cn("flex items-center justify-center py-4 text-muted-foreground", className)}>
				<Loader2 className="mr-2 size-4 animate-spin" />
				<span className="text-sm">正在生成建议问题...</span>
			</div>
		);
	}

	if (suggestions.length === 0) {
		return null;
	}

	return (
		<div className={cn("space-y-1.5 px-3 py-1.5", className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Sparkles className="size-3" />
					<span>{title}</span>
				</div>
				{onRefresh && (
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={onRefresh}
						title="刷新建议"
					>
						<RefreshCw className="size-3" />
					</Button>
				)}
			</div>
			<div className="flex flex-wrap gap-1.5">
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
						{suggestion.action === "send" && (
							<span className="text-[10px] text-muted-foreground">↵</span>
						)}
					</button>
				))}
			</div>
		</div>
	);
}
