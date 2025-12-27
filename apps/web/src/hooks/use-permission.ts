import { authClient } from "@/lib/auth-client";
import type { client } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type RolesResponse = Awaited<ReturnType<typeof client.api.meta.roles.get>>["data"];
type RolesData = UnwrapEnvelope<NonNullable<RolesResponse>>;
type RoleValue = RolesData["roles"][number];

export const UserRole: { [K in RoleValue]: K } = {
	admin: "admin",
	supervisor: "supervisor",
	workshop_supervisor: "workshop_supervisor",
	technician: "technician",
	operator: "operator",
};

export function usePermission() {
	const { data: session } = authClient.useSession();
	const user = session?.user;

	const hasRole = (allowedRoles: RoleValue[]) => {
		if (!user?.role) return false;
		return allowedRoles.includes(user.role as RoleValue);
	};

	return {
		hasRole,
		canManageUsers: hasRole([UserRole.admin]),
	};
}
