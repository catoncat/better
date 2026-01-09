import { useLocation } from "@tanstack/react-router";
import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardLayout({
	children,
	user,
}: {
	children: React.ReactNode;
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};
}) {
	const location = useLocation();

	// Simple breadcrumb logic based on path
	const breadcrumbNameMap: Record<string, string> = {
		mes: "生产执行",
		"work-orders": "工单管理",
		runs: "批次管理",
		trace: "追溯查询",
		execution: "工位执行",
		notifications: "通知管理",
		system: "系统管理",
		"user-management": "用户管理",
		"role-management": "角色管理",
		settings: "系统设置",
		profile: "个人设置",
	};

	const breadcrumbs = location.pathname
		.split("/")
		.filter(Boolean)
		.map((part, index, arr) => {
			const url = `/${arr.slice(0, index + 1).join("/")}`;
			const title = (() => {
				return breadcrumbNameMap[part] || part;
			})();
			return {
				title,
				url,
			};
		})
		.filter((crumb, index, arr) => index === 0 || crumb.title !== arr[index - 1].title)
		.map((crumb, index, arr) => ({
			...crumb,
			isLast: index === arr.length - 1,
		}));

	return (
		<SidebarProvider>
			<AppSidebar user={user} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink href="/mes/work-orders">首页</BreadcrumbLink>
								</BreadcrumbItem>
								{breadcrumbs.length > 0 && <BreadcrumbSeparator />}
								{breadcrumbs.map((crumb, _index) => (
									<React.Fragment key={crumb.url}>
										<BreadcrumbItem>
											{crumb.isLast ? (
												<BreadcrumbPage>{crumb.title}</BreadcrumbPage>
											) : (
												<BreadcrumbLink href={crumb.url}>{crumb.title}</BreadcrumbLink>
											)}
										</BreadcrumbItem>
										{!crumb.isLast && <BreadcrumbSeparator />}
									</React.Fragment>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
