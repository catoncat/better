/**
 * 用户菜单组件
 *
 * 可复用的用户下拉菜单，包含：
 * - 个人设置
 * - 通知中心
 * - 主题切换
 * - 风格切换
 * - 退出登录
 *
 * 支持两种变体：
 * - sidebar: 侧边栏样式（显示用户名和邮箱）
 * - header: 顶部导航样式（仅显示圆形头像）
 */

import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
	Bell,
	CheckIcon,
	ChevronsUpDown,
	Laptop,
	LogOut,
	Moon,
	Paintbrush,
	Palette,
	Sun,
	User,
} from "lucide-react";
import { toast } from "sonner";
import { CustomStyleEditor } from "@/components/custom-style-editor";
import { useStyle } from "@/components/style-provider";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useUnreadCount } from "@/hooks/use-notifications";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey } from "@/lib/session-query";

export interface UserMenuUser {
	name: string;
	email: string;
	image?: string | null;
}

interface UserMenuProps {
	user: UserMenuUser;
	/**
	 * 菜单变体
	 * - sidebar: 侧边栏样式，显示用户名和邮箱，使用 SidebarMenuButton
	 * - header: 顶部导航样式，仅显示圆形头像
	 */
	variant?: "sidebar" | "header";
}

export function UserMenu({ user, variant = "header" }: UserMenuProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { setTheme, theme } = useTheme();
	const { style, setStyle, styles } = useStyle();
	const { data: unreadData } = useUnreadCount();
	const unreadCount = unreadData?.count || 0;

	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					queryClient.setQueryData(sessionQueryKey, null);
					toast.success("已成功退出登录");
					router.navigate({ to: "/login" });
				},
			},
		});
	};

	// 菜单内容（两种变体共用）
	const menuContent = (
		<DropdownMenuContent
			className="min-w-56 rounded-lg"
			side={variant === "sidebar" ? "top" : "bottom"}
			align="end"
			sideOffset={4}
		>
			<DropdownMenuLabel className="p-0 font-normal">
				<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={user.image || ""} alt={user.name} />
						<AvatarFallback className="rounded-lg">{user.name?.charAt(0)}</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{user.name}</span>
						<span className="truncate text-xs">{user.email}</span>
					</div>
				</div>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuItem asChild>
					<Link to="/profile" className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<User />
							<span>个人设置</span>
						</div>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link to="/notifications" className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Bell />
							<span>通知中心</span>
						</div>
						{unreadCount > 0 && (
							<span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</Link>
				</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Palette />
						<span>主题切换</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun />
							<span>浅色模式</span>
							{theme === "light" && <CheckIcon className="ml-auto h-4 w-4" />}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon />
							<span>深色模式</span>
							{theme === "dark" && <CheckIcon className="ml-auto h-4 w-4" />}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Laptop />
							<span>跟随系统</span>
							{theme === "system" && <CheckIcon className="ml-auto h-4 w-4" />}
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Paintbrush />
						<span>风格切换</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{styles.map((s) => (
							<DropdownMenuItem key={s.id} onClick={() => setStyle(s.id)}>
								<span
									className="h-4 w-4 rounded-full border"
									style={{ backgroundColor: s.preview }}
								/>
								<span>{s.name}</span>
								{style === s.id && <CheckIcon className="ml-auto h-4 w-4" />}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<CustomStyleEditor />
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={handleLogout}>
				<LogOut />
				退出登录
			</DropdownMenuItem>
		</DropdownMenuContent>
	);

	// 侧边栏变体
	if (variant === "sidebar") {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton
						size="lg"
						className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<div className="relative">
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user.image || ""} alt={user.name} />
								<AvatarFallback className="rounded-lg">{user.name?.charAt(0)}</AvatarFallback>
							</Avatar>
							{unreadCount > 0 && (
								<span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{user.name}</span>
							<span className="truncate text-xs">{user.email}</span>
						</div>
						<ChevronsUpDown className="ml-auto size-4" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				{menuContent}
			</DropdownMenu>
		);
	}

	// 顶部导航变体（默认）
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
					<Avatar className="h-9 w-9">
						<AvatarImage src={user.image || ""} alt={user.name} />
						<AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
					</Avatar>
					{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			{menuContent}
		</DropdownMenu>
	);
}
