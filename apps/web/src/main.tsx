import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter"; // 引入 Inter 变量字体
import Loader from "./components/loader";
import { ViewPreferencesProvider } from "./hooks/use-view-preferences";
import { queryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: () => <Loader />,
	context: {
		queryClient,
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

// 平台检测与类名注入
const ua = navigator.userAgent;
const doc = document.documentElement;
doc.classList.toggle("is-windows", ua.includes("Windows"));
doc.classList.toggle("is-android", ua.includes("Android"));
doc.classList.toggle("is-macos", ua.includes("Macintosh"));

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<ViewPreferencesProvider>
			<RouterProvider router={router} />
		</ViewPreferencesProvider>,
	);
}
