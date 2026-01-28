/**
 * Simple in-memory rate limiter for chat API
 * Uses a sliding window algorithm with per-user tracking
 */

type RateLimitEntry = {
	timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
	const now = Date.now();
	const windowMs = 60 * 1000; // 1 minute window
	for (const [key, entry] of rateLimitStore.entries()) {
		entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
		if (entry.timestamps.length === 0) {
			rateLimitStore.delete(key);
		}
	}
}, CLEANUP_INTERVAL);

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfterMs: number; remaining: number };

/**
 * Check if a request is allowed under rate limiting
 * @param userId - The user ID to rate limit
 * @param maxRequests - Maximum requests per window (default from env or 20)
 * @param windowMs - Window size in milliseconds (default 60000 = 1 minute)
 */
export function checkRateLimit(
	userId: string,
	maxRequests?: number,
	windowMs = 60 * 1000,
): RateLimitResult {
	const envLimit = Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE);
	const limit = maxRequests ?? (envLimit > 0 ? envLimit : 20);
	const now = Date.now();

	let entry = rateLimitStore.get(userId);
	if (!entry) {
		entry = { timestamps: [] };
		rateLimitStore.set(userId, entry);
	}

	// Remove timestamps outside the window
	entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

	if (entry.timestamps.length >= limit) {
		// Rate limited
		const oldestTimestamp = entry.timestamps[0] ?? now;
		const retryAfterMs = oldestTimestamp + windowMs - now;
		return {
			allowed: false,
			retryAfterMs,
			remaining: 0,
		};
	}

	// Allow request and record timestamp
	entry.timestamps.push(now);
	return { allowed: true };
}

/**
 * Get current rate limit status for a user (for headers)
 */
export function getRateLimitStatus(
	userId: string,
	maxRequests?: number,
	windowMs = 60 * 1000,
): { limit: number; remaining: number; resetMs: number } {
	const envLimit = Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE);
	const limit = maxRequests ?? (envLimit > 0 ? envLimit : 20);
	const now = Date.now();

	const entry = rateLimitStore.get(userId);
	if (!entry) {
		return { limit, remaining: limit, resetMs: windowMs };
	}

	// Remove timestamps outside the window
	const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
	const remaining = Math.max(0, limit - validTimestamps.length);

	// Calculate reset time (when oldest request expires)
	const oldestValid = validTimestamps[0];
	const resetMs = oldestValid !== undefined ? oldestValid + windowMs - now : windowMs;

	return { limit, remaining, resetMs };
}
