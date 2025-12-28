import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type RoleListResponse = Awaited<ReturnType<typeof client.api.roles.get>>["data"];
type RoleListData = UnwrapEnvelope<NonNullable<RoleListResponse>>;
export type RoleItem = RoleListData["items"][number];
type RoleCreateInput = Parameters<typeof client.api.roles.post>[0];
type RoleUpdateInput = Parameters<ReturnType<typeof client.api.roles>["patch"]>[0];

export function useRoleList() {
	return useQuery<RoleListData>({
		queryKey: ["roles"],
		queryFn: async () => {
			const response = await client.api.roles.get();
			return unwrap(response);
		},
	});
}

export function useCreateRole() {
	const queryClient = useQueryClient();

	return useMutation<RoleItem, Error, RoleCreateInput>({
		mutationFn: async (data) => {
			const response = await client.api.roles.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});
}

export function useUpdateRole() {
	const queryClient = useQueryClient();

	return useMutation<RoleItem, Error, { id: string; data: RoleUpdateInput }>({
		mutationFn: async ({ id, data }) => {
			const response = await client.api.roles({ id }).patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});
}

export function useDeleteRole() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { id: string }>({
		mutationFn: async ({ id }) => {
			const response = await client.api.roles({ id }).delete();
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});
}
