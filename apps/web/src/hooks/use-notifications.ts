import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type NotificationListResponse = Awaited<ReturnType<typeof client.api.notifications.get>>["data"];
type NotificationListData = UnwrapEnvelope<NonNullable<NotificationListResponse>>;

const getErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "message" in error) {
		const value = error as { message?: unknown };
		if (typeof value.message === "string") return value.message;
	}
	return fallback;
};

export function useNotifications(params: {
	page?: number;
	limit?: number;
	status?: "unread" | "read";
	type?: string;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 20;
	const status = params.status ?? "";
	const type = params.type ?? "";

	return useQuery<NotificationListData>({
		queryKey: ["notifications", page, limit, status, type],
		queryFn: async () => {
			const response = await client.api.notifications.get({
				query: {
					page,
					limit,
					status: status || undefined,
					type: type || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: NotificationListData | undefined) => previousData,
	});
}

export function useUnreadCount() {
	return useQuery({
		queryKey: ["notifications", "unread-count"],
		queryFn: async () => {
			const { data, error } = await client.api.notifications["unread-count"].get();
			if (error) throw error;
			return data;
		},
		staleTime: 10_000,
	});
}

export function useMarkAsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await client.api.notifications({ id }).read.patch();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("已标记为已读");
		},
		onError: (error: unknown) => {
			toast.error(getErrorMessage(error, "操作失败"));
		},
	});
}

export function useMarkAllAsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await client.api.notifications["read-all"].patch();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("全部已标记为已读");
		},
		onError: (error: unknown) => {
			toast.error(getErrorMessage(error, "操作失败"));
		},
	});
}

export function useDeleteNotification() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await client.api.notifications({ id }).delete();
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("已删除");
		},
		onError: (error: unknown) => {
			toast.error(getErrorMessage(error, "删除失败"));
		},
	});
}
