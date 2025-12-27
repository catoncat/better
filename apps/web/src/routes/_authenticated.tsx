import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { fetchSession, type SessionQueryResult, sessionQueryKey } from "@/lib/session-query";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context, location }) => {
		const cachedSession = context.queryClient.getQueryData<SessionQueryResult>(sessionQueryKey);

		if (cachedSession !== undefined) {
			if (cachedSession?.data?.session) {
				return { user: cachedSession.data.user };
			}
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}

		const session = await context.queryClient.fetchQuery({
			queryKey: sessionQueryKey,
			queryFn: fetchSession,
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		});

		if (!session.data?.session) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}
		return { user: session.data.user };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { user } = Route.useRouteContext();
	return (
		<DashboardLayout user={user}>
			<Outlet />
		</DashboardLayout>
	);
}
