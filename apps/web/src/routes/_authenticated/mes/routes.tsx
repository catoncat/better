import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes/routes")({
	component: RoutesLayout,
});

function RoutesLayout() {
	return <Outlet />;
}
