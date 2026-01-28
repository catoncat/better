import { t } from "elysia";

// --- Message Schema ---
export const chatMessageSchema = t.Object({
	role: t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]),
	content: t.String(),
});

// --- Request Schema ---
export const chatRequestSchema = t.Object({
	messages: t.Array(chatMessageSchema, { minItems: 1 }),
	currentPath: t.Optional(t.String()),
});

export const chatFeedbackRequestSchema = t.Object({
	currentPath: t.Optional(t.String()),
	sessionId: t.Optional(t.String()),
	userMessage: t.String(),
	assistantMessage: t.String(),
	userMessageId: t.Optional(t.String()),
	assistantMessageId: t.Optional(t.String()),
	feedback: t.Optional(t.String()),
});

// --- Response Schemas ---
export const chatErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});

// Types for internal use
export type ChatMessage = {
	role: "user" | "assistant" | "system";
	content: string;
};

export type ChatRequest = {
	messages: ChatMessage[];
	currentPath?: string;
};

export type ChatFeedbackRequest = {
	currentPath?: string;
	sessionId?: string;
	userMessage: string;
	assistantMessage: string;
	userMessageId?: string;
	assistantMessageId?: string;
	feedback?: string;
};
