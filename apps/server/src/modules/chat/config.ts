/**
 * Dynamic chat configuration
 * Can be updated at runtime without server restart
 */

export type ChatConfig = {
	enabled: boolean;
	apiKey: string;
	baseUrl: string;
	model: string;
	maxTokens: number;
	rateLimitPerMinute: number;
	toolsEnabled: boolean;
};

// Runtime config (can be modified without restart)
let runtimeConfig: Partial<ChatConfig> = {};

/**
 * Get the current chat configuration
 * Priority: runtime config > environment variables > defaults
 */
export function getChatConfig(): ChatConfig {
	const envMaxTokens = Number(process.env.CHAT_MAX_TOKENS);
	const envRateLimit = Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE);

	return {
		enabled: runtimeConfig.enabled ?? process.env.CHAT_ENABLED === "true",
		apiKey: runtimeConfig.apiKey ?? process.env.CHAT_API_KEY ?? "",
		baseUrl: runtimeConfig.baseUrl ?? process.env.CHAT_API_BASE_URL ?? "https://api.openai.com/v1",
		model: runtimeConfig.model ?? process.env.CHAT_MODEL ?? "gpt-4o-mini",
		maxTokens: runtimeConfig.maxTokens ?? (envMaxTokens > 0 ? envMaxTokens : 2048),
		rateLimitPerMinute: runtimeConfig.rateLimitPerMinute ?? (envRateLimit > 0 ? envRateLimit : 20),
		toolsEnabled: runtimeConfig.toolsEnabled ?? process.env.CHAT_TOOLS_ENABLED === "true",
	};
}

/**
 * Update runtime configuration (no restart required)
 */
export function updateChatConfig(updates: Partial<ChatConfig>): ChatConfig {
	runtimeConfig = { ...runtimeConfig, ...updates };
	// Reset OpenAI client to pick up new config
	resetClient();
	return getChatConfig();
}

/**
 * Reset runtime config to use environment variables
 */
export function resetChatConfig(): ChatConfig {
	runtimeConfig = {};
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
