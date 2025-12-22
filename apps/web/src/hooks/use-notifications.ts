import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

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

	return useQuery({
		queryKey: ["notifications", page, limit, status, type],
		queryFn: async () => {
			const { data, error } = await client.api.notifications.get({
				query: {
					page,
					limit,
					status: status || undefined,
					type: type || undefined,
				},
			});
			if (error) throw error;
			return data;
		},
		placeholderData: (previousData) => previousData,
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
		// biome-ignore lint/suspicious/noExplicitAny: Generic error handling
		onError: (error: any) => {
			toast.error(error.message || "操作失败");
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
		// biome-ignore lint/suspicious/noExplicitAny: Generic error handling
		onError: (error: any) => {
			toast.error(error.message || "操作失败");
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
		// biome-ignore lint/suspicious/noExplicitAny: Generic error handling
		onError: (error: any) => {
			toast.error(error.message || "删除失败");
		},
	});
}
