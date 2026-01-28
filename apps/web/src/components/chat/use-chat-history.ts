import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "./use-chat";

export type ChatSession = {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	messageCount: number;
	lastPath?: string;
};

type SessionUpdate = Partial<Pick<ChatSession, "title" | "messageCount" | "lastPath">> & {
	updatedAt?: string;
};

type UseChatHistoryReturn = {
	sessions: ChatSession[];
	activeSessionId: string | null;
	activeSession: ChatSession | null;
	isReady: boolean;
	createSession: () => string;
	selectSession: (sessionId: string) => void;
	renameSession: (sessionId: string, title: string) => void;
	deleteSession: (sessionId: string) => void;
	loadMessages: (sessionId: string) => ChatMessage[];
	saveMessages: (sessionId: string, messages: ChatMessage[]) => void;
	updateSessionMeta: (sessionId: string, updates: SessionUpdate) => void;
};

const SESSIONS_KEY = "chat_sessions";
const ACTIVE_SESSION_KEY = "chat_active_session";
const MESSAGES_PREFIX = "chat_messages:";

const DEFAULT_TITLE = "新会话";

function safeParseJson<T>(value: string | null, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
	return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function nowIso(): string {
	return new Date().toISOString();
}

function newSession(): ChatSession {
	const timestamp = nowIso();
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		title: DEFAULT_TITLE,
		createdAt: timestamp,
		updatedAt: timestamp,
		messageCount: 0,
	};
}

function getStorage(): Storage | null {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

export function useChatHistory(): UseChatHistoryReturn {
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const storage = getStorage();
		if (!storage) return;

		const storedSessions = safeParseJson<ChatSession[]>(storage.getItem(SESSIONS_KEY), []);
		const normalizedSessions = sortSessions(storedSessions);
		let nextActive = storage.getItem(ACTIVE_SESSION_KEY);

		if (!nextActive || !normalizedSessions.some((session) => session.id === nextActive)) {
			nextActive = normalizedSessions[0]?.id ?? null;
		}

		let finalSessions = normalizedSessions;
		if (!nextActive) {
			const session = newSession();
			finalSessions = [session];
			nextActive = session.id;
			storage.setItem(SESSIONS_KEY, JSON.stringify(finalSessions));
			storage.setItem(ACTIVE_SESSION_KEY, nextActive);
		}

		setSessions(finalSessions);
		setActiveSessionId(nextActive);
		setIsReady(true);
	}, []);

	const persistSessions = useCallback((nextSessions: ChatSession[], nextActive?: string | null) => {
		const storage = getStorage();
		if (!storage) return;
		storage.setItem(SESSIONS_KEY, JSON.stringify(nextSessions));
		if (nextActive) {
			storage.setItem(ACTIVE_SESSION_KEY, nextActive);
		}
	}, []);

	const createSession = useCallback(() => {
		const session = newSession();
		setSessions((prev) => {
			const next = sortSessions([session, ...prev]);
			persistSessions(next, session.id);
			return next;
		});
		setActiveSessionId(session.id);
		return session.id;
	}, [persistSessions]);

	const selectSession = useCallback(
		(sessionId: string) => {
			setActiveSessionId(sessionId);
			persistSessions(sessions, sessionId);
		},
		[persistSessions, sessions],
	);

	const renameSession = useCallback(
		(sessionId: string, title: string) => {
			setSessions((prev) => {
				const next = prev.map((session) =>
					session.id === sessionId
						? {
								...session,
								title: title.trim() || DEFAULT_TITLE,
								updatedAt: nowIso(),
							}
						: session,
				);
				const sorted = sortSessions(next);
				persistSessions(sorted, activeSessionId ?? undefined);
				return sorted;
			});
		},
		[activeSessionId, persistSessions],
	);

	const deleteSession = useCallback(
		(sessionId: string) => {
			const storage = getStorage();
			setSessions((prev) => {
				const next = prev.filter((session) => session.id !== sessionId);
				const sorted = sortSessions(next);
				let nextActive = activeSessionId;
				if (activeSessionId === sessionId) {
					nextActive = sorted[0]?.id ?? null;
				}
				persistSessions(sorted, nextActive ?? undefined);
				return sorted;
			});
			if (storage) {
				storage.removeItem(`${MESSAGES_PREFIX}${sessionId}`);
			}
			if (activeSessionId === sessionId) {
				setActiveSessionId((prev) => {
					if (prev !== sessionId) return prev;
					const fallback = sessions.filter((session) => session.id !== sessionId);
					return fallback[0]?.id ?? null;
				});
			}
			if (!sessions.some((session) => session.id !== sessionId)) {
				createSession();
			}
		},
		[activeSessionId, createSession, persistSessions, sessions],
	);

	const loadMessages = useCallback((sessionId: string) => {
		const storage = getStorage();
		if (!storage) return [];
		return safeParseJson<ChatMessage[]>(storage.getItem(`${MESSAGES_PREFIX}${sessionId}`), []);
	}, []);

	const saveMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
		const storage = getStorage();
		if (!storage) return;
		storage.setItem(`${MESSAGES_PREFIX}${sessionId}`, JSON.stringify(messages));
	}, []);

	const updateSessionMeta = useCallback(
		(sessionId: string, updates: SessionUpdate) => {
			setSessions((prev) => {
				const next = prev.map((session) =>
					session.id === sessionId
						? {
								...session,
								...updates,
								updatedAt: updates.updatedAt ?? nowIso(),
							}
						: session,
				);
				const sorted = sortSessions(next);
				persistSessions(sorted, activeSessionId ?? undefined);
				return sorted;
			});
		},
		[activeSessionId, persistSessions],
	);

	const activeSession = useMemo(() => {
		return sessions.find((session) => session.id === activeSessionId) ?? null;
	}, [activeSessionId, sessions]);

	return {
		sessions,
		activeSessionId,
		activeSession,
		isReady,
		createSession,
		selectSession,
		renameSession,
		deleteSession,
		loadMessages,
		saveMessages,
		updateSessionMeta,
	};
}
