import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

// 定义 API 路由引用（避免 typeof 中使用方括号语法的问题）
const changePasswordApi = client.api.users.me["change-password"];

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type UserListResponse = Awaited<ReturnType<typeof client.api.users.get>>["data"];
type UserListData = UnwrapEnvelope<NonNullable<UserListResponse>>;
export type UserItem = UserListData["items"][number];
export type UsersList = UserListData;
type UserProfileResponse = Awaited<ReturnType<typeof client.api.users.me.get>>["data"];
type UserProfile = UnwrapEnvelope<NonNullable<UserProfileResponse>>;
type UserCreateResponse = Awaited<ReturnType<typeof client.api.users.post>>["data"];
type UserCreateData = UnwrapEnvelope<NonNullable<UserCreateResponse>>;
type RolesResponse = Awaited<ReturnType<typeof client.api.meta.roles.get>>["data"];
type RolesData = UnwrapEnvelope<NonNullable<RolesResponse>>;

type UserUpdateInput = Parameters<ReturnType<typeof client.api.users>["patch"]>[0];

interface UseUserListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	role?: string | string[];
}

export function useUserList(params: UseUserListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const search = params.search ?? "";
	const role = Array.isArray(params.role) ? params.role.join(",") : (params.role ?? "");

	return useQuery<UsersList>({
		queryKey: ["users", page, pageSize, search, role],
		queryFn: async () => {
			const response = await client.api.users.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					role: role || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: UsersList | undefined) => previousData,
	});
}

export function useUserRoles() {
	return useQuery({
		queryKey: ["meta", "roles"],
		queryFn: async () => {
			const response = await client.api.meta.roles.get();
			const data = unwrap<RolesData>(response);
			return data.roles;
		},
	});
}

type UserCreateInput = Parameters<typeof client.api.users.post>[0];

export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation<UserCreateData, Error, UserCreateInput>({
		mutationFn: async (data: UserCreateInput) => {
			const response = await client.api.users.post(data);
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});
}

export function useUpdateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UserUpdateInput }) => {
			const response = await client.api.users({ id }).patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});
}

type ProfileUpdateInput = Parameters<typeof client.api.users.me.patch>[0];
// 从 API 推断修改密码参数类型
type ChangePasswordInput = Parameters<typeof changePasswordApi.post>[0];

export function useUserProfile() {
	return useQuery<UserProfile>({
		queryKey: ["user", "me"],
		queryFn: async () => {
			const response = await client.api.users.me.get();
			return unwrap(response);
		},
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: ProfileUpdateInput) => {
			const response = await client.api.users.me.patch(data);
			return unwrap(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "me"] });
		},
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (data: ChangePasswordInput) => {
			const response = await client.api.users.me["change-password"].post(data);
			return unwrap(response);
		},
	});
}
