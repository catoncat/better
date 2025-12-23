import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes/")({
	beforeLoad: () => {
		throw redirect({ to: "/mes/work-orders", replace: true });
	},
});
