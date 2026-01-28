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
