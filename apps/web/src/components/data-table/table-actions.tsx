import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface TableAction {
	/** 操作图标 - LucideIcon 组件或 ReactNode */
	icon: LucideIcon | ReactNode;
	/** 操作名称（用于 tooltip 和下拉菜单） */
	label: string;
	/** 点击回调 */
	onClick: () => void;
	/** 是否显示为危险操作（红色） */
	destructive?: boolean;
	/** 是否显示此操作，默认 true */
	show?: boolean;
}

function renderIcon(icon: TableAction["icon"], className?: string): ReactNode {
	if (isLucideIcon(icon)) {
		const Icon = icon;
		return <Icon className={className} aria-hidden="true" />;
	}
	return icon;
}

interface TableActionsProps {
	/** 所有操作按钮，优先直接展示，空间不足时自动收起到下拉菜单 */
	actions?: TableAction[];
	/** 直接展示的主要操作按钮（兼容旧 API） */
	primary?: TableAction[];
	/** 收起到下拉菜单的次要操作（兼容旧 API） */
	secondary?: TableAction[];
	/** 强制最多展示多少个按钮，避免测量误差 */
	maxVisibleActions?: number;
}

function isLucideIcon(icon: TableAction["icon"]): icon is LucideIcon {
	return (
		typeof icon === "function" ||
		(typeof icon === "object" && icon !== null && "$$typeof" in icon && "render" in icon)
	);
}

const BUTTON_SIZE = 32;
const GAP_SIZE = 4;

/**
 * 表格操作按钮组件
 * - actions: 所有操作按钮，自动根据空间决定展示多少（推荐使用）
 * - primary/secondary: 兼容旧 API，primary 直接展示，secondary 收起
 */
export function TableActions({
	actions,
	primary = [],
	secondary = [],
	maxVisibleActions,
}: TableActionsProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [maxVisible, setMaxVisible] = useState<number | null>(null);

	// 合并 actions 或使用 primary
	const allActions = actions ?? primary;
	const visibleActions = allActions.filter((action) => action.show !== false);
	const visibleSecondary = secondary.filter((action) => action.show !== false);

	// 计算能显示多少个按钮
	useLayoutEffect(() => {
		if (typeof maxVisibleActions === "number") {
			setMaxVisible(Math.max(0, Math.min(maxVisibleActions, visibleActions.length)));
			return;
		}

		const container = containerRef.current;
		if (!container) return;

		// 找到表格容器来获取可用宽度
		const tableContainer = container.closest("[data-slot='table-container']");
		if (!tableContainer) {
			setMaxVisible(visibleActions.length);
			return;
		}

		const calculateVisible = () => {
			const availableWidth = tableContainer.clientWidth;
			// 估算其他列占用的宽度（通过当前单元格位置推断）
			const cell = container.closest("td");
			const row = cell?.parentElement;
			if (!row || !cell) {
				setMaxVisible(visibleActions.length);
				return;
			}

			// 计算其他列的总宽度
			let otherColumnsWidth = 0;
			for (const sibling of Array.from(row.children)) {
				if (sibling !== cell) {
					otherColumnsWidth += (sibling as HTMLElement).offsetWidth;
				}
			}

			// 操作列可用宽度 = 表格宽度 - 其他列宽度 - padding
			const actionColumnWidth = Math.max(0, availableWidth - otherColumnsWidth - 32);
			const moreButtonWidth = BUTTON_SIZE + GAP_SIZE;
			const hasSecondary = visibleSecondary.length > 0;

			// 计算能放下多少个按钮
			let max = visibleActions.length;
			for (let i = visibleActions.length; i >= 0; i--) {
				const buttonsWidth = i * BUTTON_SIZE + Math.max(0, i - 1) * GAP_SIZE;
				const needsMore = i < visibleActions.length || hasSecondary;
				const totalWidth = buttonsWidth + (needsMore ? moreButtonWidth : 0);
				if (totalWidth <= actionColumnWidth) {
					max = i;
					break;
				}
				max = 0;
			}
			setMaxVisible(max);
		};

		calculateVisible();

		const observer = new ResizeObserver(calculateVisible);
		observer.observe(tableContainer);
		return () => observer.disconnect();
	}, [visibleActions.length, visibleSecondary.length, maxVisibleActions]);

	const effectiveMax =
		typeof maxVisibleActions === "number"
			? Math.max(0, Math.min(maxVisibleActions, visibleActions.length))
			: (maxVisible ?? visibleActions.length);
	const displayedActions = visibleActions.slice(0, effectiveMax);
	const overflowActions = visibleActions.slice(effectiveMax);
	const hasOverflow = overflowActions.length > 0 || visibleSecondary.length > 0;

	return (
		<div ref={containerRef} className="flex items-center gap-1">
			{displayedActions.map((action) => (
				<TooltipProvider key={action.label}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className={action.destructive ? "text-destructive hover:text-destructive" : ""}
								onClick={action.onClick}
								aria-label={action.label}
							>
								{renderIcon(action.icon, "h-4 w-4")}
							</Button>
						</TooltipTrigger>
						<TooltipContent>{action.label}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			))}

			{hasOverflow && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" aria-label="更多操作">
							<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{overflowActions.map((action) => (
							<DropdownMenuItem
								key={action.label}
								onClick={action.onClick}
								className={action.destructive ? "text-destructive" : undefined}
							>
								<span className="mr-2">{renderIcon(action.icon, "h-4 w-4")}</span>
								{action.label}
							</DropdownMenuItem>
						))}
						{overflowActions.length > 0 && visibleSecondary.length > 0 && <DropdownMenuSeparator />}
						{visibleSecondary.map((action) => (
							<DropdownMenuItem
								key={action.label}
								onClick={action.onClick}
								className={action.destructive ? "text-destructive" : undefined}
							>
								<span className="mr-2">{renderIcon(action.icon, "h-4 w-4")}</span>
								{action.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
