import { Permission } from "@better-app/db/permissions";
import { useAbility } from "@/hooks/use-ability";

export function usePermission() {
	const { hasPermission } = useAbility();

	return {
		canManageUsers: hasPermission(Permission.SYSTEM_USER_MANAGE),
		canManageRoles: hasPermission(Permission.SYSTEM_ROLE_MANAGE),
	};
}
