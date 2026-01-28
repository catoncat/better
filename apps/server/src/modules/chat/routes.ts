/**
 * Chat module routes
 * Provides SSE streaming endpoint for AI chat
 */

import { Permission } from "@better-app/db";
import { Elysia, t } from "elysia";
import { userHasAnyPermission } from "../../lib/permissions";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { loadChatConfig, saveChatConfig } from "./config";
import { checkRateLimit, getRateLimitStatus } from "./rate-limit";
import { type ChatRequest, chatErrorResponseSchema, chatRequestSchema } from "./schema";
import { generateSuggestions, isChatEnabled, streamChatCompletion } from "./service";

export const chatModule = new Elysia({
	prefix: "/chat",
})
	.use(authPlugin)
	.use(prismaPlugin)
	// Get current config (admin only, hides API key)
	.get(
		"/config",
		async ({ user, db }) => {
			// Check if user has admin permission
			const isAdmin = await userHasAnyPermission(db, user.id, [Permission.SYSTEM_CONFIG]);
			if (!isAdmin) {
				return { ok: false, error: "Forbidden" };
			}

			// Load from database (ensures we have latest persisted config)
			const config = await loadChatConfig(db);
			return {
				ok: true,
				config: {
					enabled: config.enabled,
					baseUrl: config.baseUrl,
					model: config.model,
					maxTokens: config.maxTokens,
					rateLimitPerMinute: config.rateLimitPerMinute,
					toolsEnabled: config.toolsEnabled,
					// Don't expose API key
					hasApiKey: !!config.apiKey,
				},
			};
		},
		{
			isAuth: true,
			detail: {
				tags: ["Chat"],
				summary: "Get chat configuration",
				description: "Get current chat configuration (admin only)",
			},
		},
	)
	// Update config at runtime (admin only, persisted to database)
	.patch(
		"/config",
		async ({ user, body, db }) => {
			// Check if user has admin permission
			const isAdmin = await userHasAnyPermission(db, user.id, [Permission.SYSTEM_CONFIG]);
			if (!isAdmin) {
				return { ok: false, error: "Forbidden" };
			}

			// Save to database
			const newConfig = await saveChatConfig(db, body, user.id);
			return {
				ok: true,
				config: {
					enabled: newConfig.enabled,
					baseUrl: newConfig.baseUrl,
					model: newConfig.model,
					maxTokens: newConfig.maxTokens,
					rateLimitPerMinute: newConfig.rateLimitPerMinute,
					toolsEnabled: newConfig.toolsEnabled,
					hasApiKey: !!newConfig.apiKey,
				},
			};
		},
		{
			isAuth: true,
			body: t.Object({
				enabled: t.Optional(t.Boolean()),
				apiKey: t.Optional(t.String()),
				baseUrl: t.Optional(t.String()),
				model: t.Optional(t.String()),
				maxTokens: t.Optional(t.Number()),
				rateLimitPerMinute: t.Optional(t.Number()),
				toolsEnabled: t.Optional(t.Boolean()),
			}),
			detail: {
				tags: ["Chat"],
				summary: "Update chat configuration",
				description: "Update chat configuration at runtime without restart (admin only)",
			},
		},
	)
	// Main chat endpoint
	.post(
		"/",
		async function* ({ body, user, set }) {
			// Check if chat is enabled
			if (!isChatEnabled()) {
				set.status = 503;
				return JSON.stringify({
					ok: false,
					error: {
						code: "CHAT_DISABLED",
						message: "AI 聊天助手功能未启用",
					},
				});
			}

			// Check rate limit
			const rateLimitResult = checkRateLimit(user.id);
			if (!rateLimitResult.allowed) {
				set.status = 429;
				const retryAfterSec = Math.ceil(rateLimitResult.retryAfterMs / 1000);
				set.headers["Retry-After"] = String(retryAfterSec);
				return JSON.stringify({
					ok: false,
					error: {
						code: "RATE_LIMITED",
						message: `请求过于频繁，请 ${retryAfterSec} 秒后重试`,
					},
				});
			}

			// Add rate limit headers
			const rateLimitStatus = getRateLimitStatus(user.id);
			set.headers["X-RateLimit-Limit"] = String(rateLimitStatus.limit);
			set.headers["X-RateLimit-Remaining"] = String(rateLimitStatus.remaining);
			set.headers["X-RateLimit-Reset"] = String(Math.ceil(rateLimitStatus.resetMs / 1000));

			// Set SSE headers
			set.headers["Content-Type"] = "text/event-stream";
			set.headers["Cache-Control"] = "no-cache";
			set.headers.Connection = "keep-alive";

			const request = body as ChatRequest;

			try {
				// Stream the response
				for await (const chunk of streamChatCompletion({
					messages: request.messages,
					currentPath: request.currentPath,
				})) {
					// SSE format: data: <content>\n\n
					yield `data: ${JSON.stringify({ content: chunk })}\n\n`;
				}

				// Send completion event
				yield `data: ${JSON.stringify({ done: true })}\n\n`;
			} catch (error) {
				console.error("[Chat] Stream error:", error);

				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				const isApiKeyError =
					errorMessage.includes("API key") || errorMessage.includes("Unauthorized");

				yield `data: ${JSON.stringify({
					error: true,
					code: isApiKeyError ? "API_CONFIG_ERROR" : "STREAM_ERROR",
					message: isApiKeyError ? "AI 服务配置错误，请联系管理员" : "生成回复时发生错误",
				})}\n\n`;
			}
		},
		{
			isAuth: true,
			body: chatRequestSchema,
			response: {
				429: chatErrorResponseSchema,
				503: chatErrorResponseSchema,
			},
			detail: {
				tags: ["Chat"],
				summary: "AI Chat Completion (SSE)",
				description: "Stream AI chat responses using Server-Sent Events",
			},
		},
	)
	// Get suggested questions for current page
	.get(
		"/suggestions",
		async ({ query, set }) => {
			// Check if chat is enabled
			if (!isChatEnabled()) {
				set.status = 503;
				return {
					ok: false,
					error: "AI 聊天助手功能未启用",
					suggestions: [],
				};
			}

			const currentPath = query.path || "/";

			try {
				const suggestions = await generateSuggestions(currentPath);
				return {
					ok: true,
					suggestions,
				};
			} catch (error) {
				console.error("[Chat] Failed to generate suggestions:", error);
				return {
					ok: true,
					suggestions: [], // Return empty array on error, don't fail
				};
			}
		},
		{
			isAuth: true,
			query: t.Object({
				path: t.Optional(t.String()),
			}),
			detail: {
				tags: ["Chat"],
				summary: "Get suggested questions",
				description: "Get AI-generated suggested questions based on current page",
			},
		},
	);
