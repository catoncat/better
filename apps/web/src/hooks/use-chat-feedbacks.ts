import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/eden";

const chatApi = client.api.chat;

export type ChatFeedbackItem = {
	id: string;
	userId: string;
	sessionId: string | null;
	currentPath: string | null;
	userMessage: string;
	assistantMessage: string;
	userMessageId: string | null;
	assistantMessageId: string | null;
	feedback: string | null;
	createdAt: Date | string;
	user: {
		id: string;
		name: string;
		username: string | null;
	};
};

export interface UseChatFeedbackListParams {
	page?: number;
	pageSize?: number;
}

export function useChatFeedbackList(params: UseChatFeedbackListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 20;

	return useQuery({
		queryKey: ["chat-feedbacks", page, pageSize],
		queryFn: async () => {
			const { data, error } = await chatApi.feedbacks.get({
				query: {
					page: String(page),
					pageSize: String(pageSize),
				},
			});

			if (error) throw error;
			return data as { data: ChatFeedbackItem[]; pagination: { pageCount: number; total: number } };
		},
		placeholderData: (previousData) => previousData,
	});
}
