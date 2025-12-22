import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/eden";

// 定义 API 路由引用（避免 typeof 中使用方括号语法的问题）
const changePasswordApi = client.api.users.me["change-password"];

type UsersApiResponse = Awaited<ReturnType<typeof client.api.users.get>>["data"];
export type UserItem = NonNullable<UsersApiResponse>["items"][number];
export type UsersList = Exclude<
	UsersApiResponse,
	{ code: string; message: string } | null | undefined
>;

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
			const { data, error } = await client.api.users.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					role: role || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			if (!data) {
				throw new Error("No data received");
			}

			return data;
		},
		placeholderData: (previousData: UsersList | undefined) => previousData,
	});
}

export function useUserRoles() {
	return useQuery({
		queryKey: ["meta", "roles"],
		queryFn: async () => {
			const { data, error } = await client.api.meta.roles.get();

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return data?.roles ?? [];
		},
	});
}

type UserCreateInput = Parameters<typeof client.api.users.post>[0];

export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UserCreateInput) => {
			// We cast data to any here because Eden inference might lag behind backend changes slightly
			// or we can define the type explicitly if needed.
			const { data: result, error } = await client.api.users.post(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return result;
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
			const { data: result, error } = await client.api.users({ id }).patch(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return result;
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
	return useQuery({
		queryKey: ["user", "me"],
		queryFn: async () => {
			const { data, error } = await client.api.users.me.get();

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return data;
		},
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: ProfileUpdateInput) => {
			const { data: result, error } = await client.api.users.me.patch(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "me"] });
		},
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (data: ChangePasswordInput) => {
			const { data: result, error } = await client.api.users.me["change-password"].post(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			return result;
		},
	});
}
