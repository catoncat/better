import { getMesErrorMessage } from "@better-app/shared/error-codes";

export class ApiError extends Error {
	constructor(
		public code: string,
		public message: string,
		public details?: unknown,
		public status?: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

const hasCjk = (value: string) => /[\u4e00-\u9fff]/.test(value);

export const getApiErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof ApiError) {
		const registryMessage = getMesErrorMessage(error.code);
		if (registryMessage) return registryMessage;
		const message = error.message?.trim();
		const isCjkMessage = Boolean(message && hasCjk(message));
		if (error.status === 401 || error.code === "UNAUTHORIZED") {
			return isCjkMessage ? (message as string) : "登录已过期，请重新登录";
		}
		if (error.status === 403 || error.code === "FORBIDDEN") {
			if (isCjkMessage) return message as string;
			const match = message?.match(/Missing required permission: ([\w:.-]+)/);
			if (match?.[1]) {
				return `权限不足（缺少权限: ${match[1]}）`;
			}
			return "权限不足";
		}
		if (isCjkMessage) {
			return error.code ? `${message}（${error.code}）` : (message as string);
		}
		const base = fallback;
		return error.code ? `${base}（${error.code}）` : base;
	}
	if (error instanceof Error) {
		if (error.message?.trim() && hasCjk(error.message)) {
			return error.message;
		}
		return fallback;
	}
	if (error && typeof error === "object" && "message" in error) {
		const value = error as { message?: unknown };
		if (typeof value.message === "string" && value.message.trim() && hasCjk(value.message)) {
			return value.message;
		}
	}
	return fallback;
};
