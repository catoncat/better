/**
 * OpenAI client service for chat completions
 * Supports any OpenAI-compatible API via configurable base URL
 * Includes tool calling for accessing the codebase
 */

import OpenAI from "openai";
import { getChatConfig, setResetClientCallback } from "./config";
import type { ChatMessage } from "./schema";
import { generateSystemPrompt } from "./system-prompt";
import { chatTools, executeTool } from "./tools";

// Lazy-initialized client (created on first use)
let openaiClient: OpenAI | null = null;

// Register reset callback
setResetClientCallback(() => {
	openaiClient = null;
});

/**
 * Check if chat feature is enabled
 */
export function isChatEnabled(): boolean {
	return getChatConfig().enabled;
}

/**
 * Get or create the OpenAI client
 */
function getClient(): OpenAI {
	const config = getChatConfig();

	if (!openaiClient) {
		if (!config.apiKey) {
			throw new Error("CHAT_API_KEY is not configured");
		}

		openaiClient = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseUrl,
		});
	}
	return openaiClient;
}

/**
 * Get the configured model name
 */
function getModel(): string {
	return getChatConfig().model;
}

/**
 * Get the configured max tokens
 */
function getMaxTokens(): number {
	return getChatConfig().maxTokens;
}

export type StreamChatOptions = {
	messages: ChatMessage[];
	currentPath?: string;
	onToken?: (token: string) => void;
	onComplete?: (fullContent: string) => void;
	onError?: (error: Error) => void;
	signal?: AbortSignal;
};

// Maximum tool call iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5;

/**
 * Check if tools are enabled (for development only, not production)
 * Tools require access to project files which don't exist in production builds
 */
function isToolsEnabled(): boolean {
	// Tools only work in development with source files available
	// In production (single binary), there are no project files to query
	if (process.env.NODE_ENV === "production") {
		return false;
	}
	return getChatConfig().toolsEnabled;
}

/**
 * Stream chat completion responses with optional tool calling support
 * Returns an async generator that yields content chunks
 */
export async function* streamChatCompletion(
	options: StreamChatOptions,
): AsyncGenerator<string, void, unknown> {
	const { messages, currentPath, signal } = options;
	const client = getClient();
	const model = getModel();
	const maxTokens = getMaxTokens();
	const toolsEnabled = isToolsEnabled();

	// Build messages array with system prompt (pass toolsEnabled to customize instructions)
	const systemPrompt = generateSystemPrompt(currentPath, toolsEnabled);
	const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		...messages.map((m) => ({
			role: m.role as "user" | "assistant" | "system",
			content: m.content,
		})),
	];

	// If tools are disabled, use simple streaming without tool calls
	if (!toolsEnabled) {
		const stream = await client.chat.completions.create(
			{
				model,
				messages: apiMessages,
				max_tokens: maxTokens,
				stream: true,
			},
			{ signal },
		);

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content;
			if (content) {
				yield content;
			}
		}
		return;
	}

	// Tools-enabled flow with iteration loop
	let iteration = 0;

	while (iteration < MAX_TOOL_ITERATIONS) {
		iteration++;

		// Create streaming completion with tools
		const stream = await client.chat.completions.create(
			{
				model,
				messages: apiMessages,
				max_tokens: maxTokens,
				tools: chatTools,
				tool_choice: "auto",
				stream: true,
			},
			{ signal },
		);

		// Collect the full response to check for tool calls
		let assistantContent = "";
		const toolCalls: Array<{
			id: string;
			name: string;
			arguments: string;
		}> = [];

		for await (const chunk of stream) {
			const choice = chunk.choices[0];
			if (!choice) continue;

			// Stream text content to the client
			const content = choice.delta?.content;
			if (content) {
				assistantContent += content;
				yield content;
			}

			// Collect tool calls
			const deltaToolCalls = choice.delta?.tool_calls;
			if (deltaToolCalls) {
				for (const tc of deltaToolCalls) {
					const index = tc.index;
					if (!toolCalls[index]) {
						toolCalls[index] = {
							id: tc.id || "",
							name: tc.function?.name || "",
							arguments: tc.function?.arguments || "",
						};
					} else {
						if (tc.id) toolCalls[index].id = tc.id;
						if (tc.function?.name) toolCalls[index].name += tc.function.name;
						if (tc.function?.arguments) toolCalls[index].arguments += tc.function.arguments;
					}
				}
			}
		}

		// Filter out incomplete tool calls (missing id or name)
		const validToolCalls = toolCalls.filter((tc) => tc.id && tc.name);

		// If no valid tool calls, we're done
		if (validToolCalls.length === 0) {
			break;
		}

		console.log("[Chat] Tool calls:", JSON.stringify(validToolCalls, null, 2));

		// Execute tool calls and add results to messages
		apiMessages.push({
			role: "assistant",
			content: assistantContent || null,
			tool_calls: validToolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments,
				},
			})),
		});

		// Process each tool call
		for (const toolCall of validToolCalls) {

			// Indicate to user that we're fetching info
			yield `\n\n🔍 *正在查询代码库...*\n\n`;

			try {
				const args = JSON.parse(toolCall.arguments || "{}");
				console.log(`[Chat] Executing tool: ${toolCall.name}`, args);
				const result = await executeTool(toolCall.name, args);
				console.log(`[Chat] Tool result (${result.length} chars):`, result.slice(0, 200));

				apiMessages.push({
					role: "tool",
					tool_call_id: toolCall.id,
					content: result,
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				apiMessages.push({
					role: "tool",
					tool_call_id: toolCall.id,
					content: `工具执行错误: ${errorMessage}`,
				});
			}
		}

		// Continue the loop to let the model respond with the tool results
	}
}

/**
 * Non-streaming chat completion (for simpler use cases)
 */
export async function chatCompletion(
	messages: ChatMessage[],
	currentPath?: string,
): Promise<string> {
	const client = getClient();
	const model = getModel();
	const maxTokens = getMaxTokens();

	// Build messages array with system prompt
	const systemPrompt = generateSystemPrompt(currentPath);
	const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		...messages.map((m) => ({
			role: m.role as "user" | "assistant" | "system",
			content: m.content,
		})),
	];

	const response = await client.chat.completions.create({
		model,
		messages: apiMessages,
		max_tokens: maxTokens,
		tools: chatTools,
		tool_choice: "auto",
	});

	return response.choices[0]?.message?.content || "";
}
