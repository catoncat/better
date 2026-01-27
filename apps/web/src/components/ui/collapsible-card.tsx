"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
	title: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	/** Header 右侧的操作按钮区域 */
	headerActions?: React.ReactNode;
	children: React.ReactNode;
	/** 默认是否展开，默认 true */
	defaultOpen?: boolean;
	className?: string;
}

export function CollapsibleCard({
	title,
	description,
	icon,
	headerActions,
	children,
	defaultOpen = true,
	className,
}: CollapsibleCardProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
			<Card className={className}>
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{icon}
								<div>
									<CardTitle className="flex items-center gap-2">
										{title}
										<ChevronDown
											className={cn(
												"h-4 w-4 text-muted-foreground transition-transform duration-200",
												isOpen && "rotate-180",
											)}
										/>
									</CardTitle>
									{description && <CardDescription className="mt-1">{description}</CardDescription>}
								</div>
							</div>
							{headerActions && (
								// biome-ignore lint/a11y/useSemanticElements: stopPropagation wrapper for button group
								<div
									className="flex items-center gap-2"
									role="group"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									{headerActions}
								</div>
							)}
						</div>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent>{children}</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}
