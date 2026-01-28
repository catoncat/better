/**
 * Dynamic chat configuration
 * Persisted to database via SystemConfig table
 */

import type { PrismaClient } from "@better-app/db";

export type ChatConfig = {
	enabled: boolean;
	apiKey: string;
	baseUrl: string;
	model: string;
	maxTokens: number;
	rateLimitPerMinute: number;
	toolsEnabled: boolean;
};

// Database key for chat config
const CHAT_CONFIG_KEY = "chat_assistant";

// In-memory cache (loaded from DB on first access)
let cachedConfig: Partial<ChatConfig> | null = null;

/**
 * Get defaults from environment variables
 */
function getEnvDefaults(): ChatConfig {
	const envMaxTokens = Number(process.env.CHAT_MAX_TOKENS);
	const envRateLimit = Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE);

	return {
		enabled: process.env.CHAT_ENABLED === "true",
		apiKey: process.env.CHAT_API_KEY ?? "",
		baseUrl: process.env.CHAT_API_BASE_URL ?? "https://api.openai.com/v1",
		model: process.env.CHAT_MODEL ?? "gpt-4o-mini",
		maxTokens: envMaxTokens > 0 ? envMaxTokens : 2048,
		rateLimitPerMinute: envRateLimit > 0 ? envRateLimit : 20,
		toolsEnabled: process.env.CHAT_TOOLS_ENABLED === "true",
	};
}

/**
 * Get the current chat configuration
 * Priority: database config > environment variables > defaults
 */
export function getChatConfig(): ChatConfig {
	const defaults = getEnvDefaults();

	if (!cachedConfig) {
		return defaults;
	}

	return {
		enabled: cachedConfig.enabled ?? defaults.enabled,
		apiKey: cachedConfig.apiKey ?? defaults.apiKey,
		baseUrl: cachedConfig.baseUrl ?? defaults.baseUrl,
		model: cachedConfig.model ?? defaults.model,
		maxTokens: cachedConfig.maxTokens ?? defaults.maxTokens,
		rateLimitPerMinute: cachedConfig.rateLimitPerMinute ?? defaults.rateLimitPerMinute,
		toolsEnabled: cachedConfig.toolsEnabled ?? defaults.toolsEnabled,
	};
}

/**
 * Load config from database into memory cache
 */
export async function loadChatConfig(db: PrismaClient): Promise<ChatConfig> {
	try {
		const record = await db.systemConfig.findUnique({
			where: { key: CHAT_CONFIG_KEY },
		});

		if (record?.value) {
			cachedConfig = record.value as Partial<ChatConfig>;
		}
	} catch (error) {
		console.error("[Chat] Failed to load config from database:", error);
	}

	return getChatConfig();
}

/**
 * Save config to database and update memory cache
 */
export async function saveChatConfig(
	db: PrismaClient,
	updates: Partial<ChatConfig>,
	userId?: string,
): Promise<ChatConfig> {
	// Merge with existing cached config
	const newConfig = { ...cachedConfig, ...updates };

	try {
		await db.systemConfig.upsert({
			where: { key: CHAT_CONFIG_KEY },
			create: {
				key: CHAT_CONFIG_KEY,
				name: "AI Chat Assistant Configuration",
				value: newConfig as object,
				updatedBy: userId,
			},
			update: {
				value: newConfig as object,
				updatedBy: userId,
			},
		});

		// Update memory cache
		cachedConfig = newConfig;
		// Reset OpenAI client to pick up new config
		resetClient();
	} catch (error) {
		console.error("[Chat] Failed to save config to database:", error);
		throw error;
	}

	return getChatConfig();
}

/**
 * Reset config to environment variable defaults
 */
export async function resetChatConfig(db: PrismaClient): Promise<ChatConfig> {
	try {
		await db.systemConfig.delete({
			where: { key: CHAT_CONFIG_KEY },
		});
	} catch {
		// Ignore if not exists
	}

	cachedConfig = null;
	resetClient();
	return getChatConfig();
}

// Client reset callback (set by service.ts)
let resetClientCallback: (() => void) | null = null;

export function setResetClientCallback(callback: () => void) {
	resetClientCallback = callback;
}

function resetClient() {
	if (resetClientCallback) {
		resetClientCallback();
	}
}
