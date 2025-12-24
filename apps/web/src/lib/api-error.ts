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
