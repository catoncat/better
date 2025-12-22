import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface CardAction {
	icon: LucideIcon | ReactNode;
	label: string;
	onClick: () => void;
	destructive?: boolean;
	show?: boolean;
}

function isLucideIcon(icon: CardAction["icon"]): icon is LucideIcon {
	return (
		typeof icon === "function" ||
		(typeof icon === "object" && icon !== null && "$$typeof" in icon && "render" in icon)
	);
}

function renderIcon(icon: CardAction["icon"], className?: string): ReactNode {
	if (isLucideIcon(icon)) {
		const Icon = icon;
		return <Icon className={className} />;
	}
	return icon;
}

interface CardActionsProps {
	actions: CardAction[];
	primaryAction?: CardAction;
}

export function CardActions({ actions, primaryAction }: CardActionsProps) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const visibleActions = actions.filter((action) => action.show !== false);

	if (visibleActions.length === 0 && !primaryAction) {
		return null;
	}

	const handleActionClick = (action: CardAction) => {
		setSheetOpen(false);
		action.onClick();
	};

	const normalActions = visibleActions.filter((a) => !a.destructive);
	const destructiveActions = visibleActions.filter((a) => a.destructive);

	return (
		<div className="flex items-center gap-1">
			{primaryAction && primaryAction.show !== false && (
				<Button variant="ghost" size="sm" onClick={primaryAction.onClick}>
					{renderIcon(primaryAction.icon, "mr-2 h-4 w-4")}
					{primaryAction.label}
				</Button>
			)}

			{visibleActions.length > 0 && (
				<>
					{/* Desktop: Dropdown Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="hidden md:inline-flex">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{normalActions.map((action) => (
								<DropdownMenuItem key={action.label} onClick={action.onClick}>
									{renderIcon(action.icon, "mr-2 h-4 w-4")}
									{action.label}
								</DropdownMenuItem>
							))}
							{normalActions.length > 0 && destructiveActions.length > 0 && (
								<DropdownMenuSeparator />
							)}
							{destructiveActions.map((action) => (
								<DropdownMenuItem
									key={action.label}
									onClick={action.onClick}
									className="text-destructive focus:text-destructive"
								>
									{renderIcon(action.icon, "mr-2 h-4 w-4")}
									{action.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Mobile: Bottom Sheet */}
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={() => setSheetOpen(true)}
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>

					<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
						<SheetContent side="bottom" className="h-auto">
							<SheetHeader className="px-4 pb-2">
								<SheetTitle>操作</SheetTitle>
							</SheetHeader>
							<div className="flex flex-col gap-1 px-4 pb-4">
								{normalActions.map((action) => (
									<Button
										key={action.label}
										variant="ghost"
										className="justify-start h-12 text-base"
										onClick={() => handleActionClick(action)}
									>
										{renderIcon(action.icon, "mr-3 h-5 w-5")}
										{action.label}
									</Button>
								))}
								{normalActions.length > 0 && destructiveActions.length > 0 && (
									<div className="my-2 border-t" />
								)}
								{destructiveActions.map((action) => (
									<Button
										key={action.label}
										variant="ghost"
										className={cn(
											"justify-start h-12 text-base",
											"text-destructive hover:text-destructive hover:bg-destructive/10",
										)}
										onClick={() => handleActionClick(action)}
									>
										{renderIcon(action.icon, "mr-3 h-5 w-5")}
										{action.label}
									</Button>
								))}
							</div>
						</SheetContent>
					</Sheet>
				</>
			)}
		</div>
	);
}
