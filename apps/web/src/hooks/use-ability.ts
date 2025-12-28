import { ALL_PERMISSIONS, type PermissionValue } from "@better-app/db/permissions";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type PermissionsResponse = Awaited<ReturnType<typeof client.api.permissions.me.get>>["data"];
type PermissionsData = UnwrapEnvelope<NonNullable<PermissionsResponse>>;

export function useAbility() {
	const query = useQuery<PermissionsData>({
		queryKey: ["auth", "permissions"],
		queryFn: async () => {
			const response = await client.api.permissions.me.get();
			return unwrap(response);
		},
	});

	const permissionSet = useMemo(() => {
		const set = new Set<PermissionValue>();
		if (!query.data) return set;
		for (const role of query.data.roles) {
			for (const perm of role.permissions) {
				if (ALL_PERMISSIONS.includes(perm as PermissionValue)) {
					set.add(perm as PermissionValue);
				}
			}
		}
		return set;
	}, [query.data]);

	const hasPermission = (permission: PermissionValue) => permissionSet.has(permission);
	const hasAnyPermission = (permissions: PermissionValue[]) =>
		permissions.some((permission) => permissionSet.has(permission));
	const hasAllPermissions = (permissions: PermissionValue[]) =>
		permissions.every((permission) => permissionSet.has(permission));

	return {
		...query,
		permissionSet,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		roles: query.data?.roles ?? [],
		lineIds: query.data?.lineIds ?? [],
		stationIds: query.data?.stationIds ?? [],
	};
}
