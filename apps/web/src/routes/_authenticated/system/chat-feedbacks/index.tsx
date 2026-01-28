import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout } from "@/components/data-list";
import { useAbility } from "@/hooks/use-ability";
import { type ChatFeedbackItem, useChatFeedbackList } from "@/hooks/use-chat-feedbacks";
import { ChatFeedbackCard } from "./-components/chat-feedback-card";
import { getChatFeedbackColumns } from "./-components/chat-feedback-columns";
import { ChatFeedbackDialog } from "./-components/chat-feedback-dialog";

interface ChatFeedbackSearchParams {
	page?: number;
	pageSize?: number;
	sort?: string;
}

export const Route = createFileRoute("/_authenticated/system/chat-feedbacks/")({
	validateSearch: (search: Record<string, unknown>): ChatFeedbackSearchParams => ({
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 20,
		sort: (search.sort as string) || undefined,
	}),
	component: ChatFeedbacksPage,
});

function ChatFeedbacksPage() {
	const viewPreferencesKey = "chat-feedbacks";
	const navigate = useNavigate();
	const searchParams = useSearch({ strict: false });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canView = hasPermission(Permission.SYSTEM_CHAT_FEEDBACK);

	// Pagination state (driven by URL)
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 20);

	// Dialog state
	const [selectedFeedback, setSelectedFeedback] = useState<ChatFeedbackItem | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 20);
	}, [searchParams.page, searchParams.pageSize]);

	const { data, isLoading } = useChatFeedbackList({
		page: pageIndex + 1,
		pageSize,
	});

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					page: next.pageIndex + 1,
					pageSize: next.pageSize,
				}),
				replace: true,
			});
		},
		[navigate],
	);

	const handleView = useCallback((item: ChatFeedbackItem) => {
		setSelectedFeedback(item);
		setDialogOpen(true);
	}, []);

	const columns = useMemo(() => getChatFeedbackColumns({ onView: handleView }), [handleView]);

	const header = (
		<div>
			<h1 className="text-2xl font-bold tracking-tight">用户反馈</h1>
			<p className="text-muted-foreground">查看用户对 AI 助手的反馈和对话上下文</p>
		</div>
	);

	if (!canView) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要查看 AI 反馈权限才能访问该页面。" />
			</div>
		);
	}

	return (
		<>
			<DataListLayout
				mode="server"
				data={data?.data || []}
				columns={columns}
				pageCount={data?.pagination?.pageCount || 1}
				onPaginationChange={handlePaginationChange}
				initialPageIndex={pageIndex}
				initialPageSize={pageSize}
				locationSearch={locationSearch}
				isLoading={isLoading}
				header={header}
				filterToolbarProps={{
					fields: [],
					filters: {},
					onFilterChange: () => {},
					onReset: () => {},
					isFiltered: false,
					viewPreferencesKey,
				}}
				dataListViewProps={{
					viewPreferencesKey,
					renderCard: (item) => <ChatFeedbackCard item={item} onClick={() => handleView(item)} />,
				}}
			/>
			<ChatFeedbackDialog item={selectedFeedback} open={dialogOpen} onOpenChange={setDialogOpen} />
		</>
	);
}
