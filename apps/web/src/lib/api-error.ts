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

export const getApiErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof ApiError) {
		const base = error.message?.trim() ? error.message : fallback;
		return error.code ? `${base}（${error.code}）` : base;
	}
	if (error instanceof Error) {
		return error.message?.trim() ? error.message : fallback;
	}
	if (error && typeof error === "object" && "message" in error) {
		const value = error as { message?: unknown };
		if (typeof value.message === "string" && value.message.trim()) {
			return value.message;
		}
	}
	return fallback;
};
