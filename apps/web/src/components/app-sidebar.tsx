import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
	Bell,
	CheckIcon,
	ChevronRight,
	ChevronsUpDown,
	GalleryVerticalEnd,
	Laptop,
	LogOut,
	Moon,
	Palette,
	Sun,
	User,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { type NavItem, navMain } from "@/config/navigation";
import { useAbility } from "@/hooks/use-ability";
import { useUnreadCount } from "@/hooks/use-notifications";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey } from "@/lib/session-query";

export function AppSidebar({
	user,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	user?: { name: string; email: string; image?: string | null };
}) {
	const router = useRouter();
	const location = useLocation();
	const { state } = useSidebar();
	const { setTheme, theme } = useTheme();
	const { data: unreadData } = useUnreadCount();
	const unreadCount = unreadData?.count || 0;
	const queryClient = useQueryClient();
	const { hasAnyPermission, hasAllPermissions, isLoading: permissionsLoading } = useAbility();

	const canViewItem = (item: NavItem) => {
		if (!item.permissions || item.permissions.length === 0) return true;
		if (permissionsLoading) return false;
		return item.permissionMode === "all"
			? hasAllPermissions(item.permissions)
			: hasAnyPermission(item.permissions);
	};

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

	return (
		<Sidebar variant="inset" collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link to="/instruments">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<GalleryVerticalEnd className="size-4" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-medium">Better APP</span>
									<span className="">Enterprise</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>管理平台</SidebarGroupLabel>
					<SidebarMenu className="gap-2">
						{navMain
							.filter((item) => canViewItem(item))
							.map((item) => {
								const visibleItems = item.items?.filter((subItem) => canViewItem(subItem));

								const isGroupActive =
									location.pathname.startsWith(item.url) ||
									(visibleItems ?? []).some((subItem) => location.pathname.startsWith(subItem.url));
								if (item.items) {
									if (!visibleItems?.length) {
										return null;
									}

									if (state === "collapsed") {
										return (
											<CollapsedSidebarMenuItem
												key={item.title}
												item={item}
												visibleItems={visibleItems}
											/>
										);
									}

									return (
										<Collapsible
											key={item.title}
											asChild
											defaultOpen={isGroupActive}
											className="group/collapsible"
										>
											<SidebarMenuItem>
												<CollapsibleTrigger asChild>
													<SidebarMenuButton tooltip={item.title} className="font-medium">
														{item.icon && <item.icon />}
														<span>{item.title}</span>
														<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
													</SidebarMenuButton>
												</CollapsibleTrigger>
												<CollapsibleContent>
													<SidebarMenuSub>
														{visibleItems.map((subItem) => {
															const isSubActive = location.pathname === subItem.url;
															return (
																<SidebarMenuSubItem key={subItem.title}>
																	<SidebarMenuSubButton asChild isActive={isSubActive}>
																		<Link to={subItem.url}>{subItem.title}</Link>
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															);
														})}
													</SidebarMenuSub>
												</CollapsibleContent>
											</SidebarMenuItem>
										</Collapsible>
									);
								}

								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton asChild isActive={isGroupActive} tooltip={item.title}>
											<Link to={item.url} className="font-medium">
												{item.icon && <item.icon />}
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<div className="relative">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src={user?.image || ""} alt={user?.name} />
											<AvatarFallback className="rounded-lg">
												{user?.name?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										{unreadCount > 0 && (
											<span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
												{unreadCount > 99 ? "99+" : unreadCount}
											</span>
										)}
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">{user?.name}</span>
										<span className="truncate text-xs">{user?.email}</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								side="bottom"
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src={user?.image || ""} alt={user?.name} />
											<AvatarFallback className="rounded-lg">
												{user?.name?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">{user?.name}</span>
											<span className="truncate text-xs">{user?.email}</span>
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
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut />
									退出登录
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

function CollapsedSidebarMenuItem({
	item,
	visibleItems,
}: {
	item: (typeof navMain)[number];
	visibleItems: NonNullable<(typeof navMain)[number]["items"]>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleMouseEnter = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setIsOpen(true);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			setIsOpen(false);
		}, 100);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	return (
		<SidebarMenuItem onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton className="font-medium">
						{item.icon && <item.icon />}
						<span>{item.title}</span>
						<ChevronRight className="ml-auto" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="right"
					align="start"
					className="min-w-56 rounded-lg"
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					<DropdownMenuLabel>{item.title}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{visibleItems.map((subItem) => (
						<DropdownMenuItem key={subItem.title} asChild>
							<Link to={subItem.url} className="w-full cursor-pointer">
								{subItem.title}
							</Link>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}
