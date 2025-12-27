import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import "../index.css";

export type RouterAppContext = {
	queryClient: typeof queryClient;
};

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Cache and reuse list/detail data to reduce redundant fetches.
			staleTime: 30_000,
			gcTime: 5 * 60_000,
			refetchOnWindowFocus: false,
		},
	},
});

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
	return (
		<QueryClientProvider client={queryClient}>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<Outlet />
				<Toaster richColors />
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
						<Link to="/instruments" className="text-primary hover:underline">
							返回仪器列表
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
