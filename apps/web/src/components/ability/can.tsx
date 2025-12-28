import type { PermissionValue } from "@better-app/db/permissions";
import type { ReactNode } from "react";
import { useAbility } from "@/hooks/use-ability";

type CanMode = "any" | "all";

type CanProps = {
	permissions: PermissionValue | PermissionValue[];
	mode?: CanMode;
	children: ReactNode;
	fallback?: ReactNode;
};

export function Can({ permissions, mode = "any", children, fallback = null }: CanProps) {
	const { hasAnyPermission, hasAllPermissions, isLoading } = useAbility();
	const required = Array.isArray(permissions) ? permissions : [permissions];

	if (isLoading) return fallback;

	const allowed = mode === "all" ? hasAllPermissions(required) : hasAnyPermission(required);
	return allowed ? children : fallback;
}
