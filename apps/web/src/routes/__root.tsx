import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StyleProvider } from "@/components/style-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import "../index.css";

export type RouterAppContext = {
	queryClient: typeof queryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	head: () => ({
		meta: [
			{
				title: "better-app",
			},
			{
				name: "description",
				content: "better-app is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	useDynamicFavicon();

	return (
		<QueryClientProvider client={queryClient}>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<StyleProvider>
					<Outlet />
					<Toaster richColors />
				</StyleProvider>
			</ThemeProvider>
			{/* <TanStackRouterDevtools position="bottom-right" /> */}
		</QueryClientProvider>
	);
}

function NotFoundComponent() {
	const { data: session } = authClient.useSession();

	if (session?.user) {
		return (
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<DashboardLayout user={session.user}>
					<div className="flex flex-col items-center justify-center h-full gap-4">
						<h1 className="text-4xl font-bold">404</h1>
						<p className="text-xl text-muted-foreground">页面未找到</p>
						<Link to="/mes/work-orders" className="text-primary hover:underline">
							返回工单管理
						</Link>
					</div>
				</DashboardLayout>
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
			storageKey="vite-ui-theme"
		>
			<div className="flex flex-col items-center justify-center h-screen gap-4">
				<h1 className="text-4xl font-bold">404</h1>
				<p className="text-xl text-muted-foreground">页面未找到</p>
				<Link to="/login" className="text-primary hover:underline">
					去登录
				</Link>
			</div>
		</ThemeProvider>
	);
}
