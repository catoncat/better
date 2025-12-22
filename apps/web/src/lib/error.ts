export function getReadableErrorMessage(
	error: unknown,
	options?: {
		fallback?: string;
	},
): string {
	const fallback = options?.fallback ?? "操作失败，请稍后重试";

	if (!error) return fallback;

	const raw = error instanceof Error ? error.message : typeof error === "string" ? error : null;

	if (!raw) return fallback;

	const message = raw.trim();
	if (!message) return fallback;

	if (/Failed to fetch|NetworkError|网络错误|ERR_NETWORK|ECONN|ETIMEDOUT|timeout/i.test(message)) {
		return "网络异常，请检查网络后重试";
	}

	const parsed = tryParseJson(message);
	const parsedMessage = extractMessageFromUnknown(parsed);
	if (parsedMessage) return parsedMessage;

	if (message === "An error occurred") return fallback;
	return message;
}

function tryParseJson(value: string): unknown {
	const trimmed = value.trim();
	const looksLikeJson =
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"));
	if (!looksLikeJson) return null;

	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return null;
	}
}

function extractMessageFromUnknown(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string") return value.trim() || null;
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractMessageFromUnknown(item);
			if (nested) return nested;
		}
		return null;
	}
	if (typeof value !== "object") return null;

	const record = value as Record<string, unknown>;
	const direct =
		(typeof record.message === "string" && record.message.trim()) ||
		(typeof record.error === "string" && record.error.trim()) ||
		null;
	if (direct) return direct;

	if (record.error && typeof record.error === "object") {
		const nested = extractMessageFromUnknown(record.error);
		if (nested) return nested;
	}

	if (record.value && typeof record.value === "object") {
		const nested = extractMessageFromUnknown(record.value);
		if (nested) return nested;
	}

	return null;
}
