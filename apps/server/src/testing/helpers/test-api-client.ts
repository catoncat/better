export type TestApiResponse<T> = {
	res: Response;
	data: T | null;
};

type RequestOptions = {
	headers?: Record<string, string>;
	body?: unknown;
};

export class TestApiClient {
	private cookie = "";

	constructor(private readonly handler: (request: Request) => Response | Promise<Response>) {}

	async login(email: string, password: string) {
		const { res, data } = await this.post<unknown>("/api/auth/sign-in/email", {
			email,
			password,
		});

		if (!res.ok) {
			throw new Error(`Login failed: ${res.status} ${JSON.stringify(data)}`);
		}

		const rawCookie = res.headers.get("set-cookie") || "";
		this.cookie = rawCookie.split(";")[0] || "";
		if (!this.cookie) {
			throw new Error("Login succeeded but session cookie is missing");
		}
	}

	async get<T>(path: string, options?: RequestOptions) {
		return this.request<T>("GET", path, options);
	}

	async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
		return this.request<T>("POST", path, { ...options, body });
	}

	async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
		return this.request<T>("PUT", path, { ...options, body });
	}

	private async request<T>(
		method: string,
		path: string,
		options?: RequestOptions,
	): Promise<TestApiResponse<T>> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options?.headers ?? {}),
		};
		if (this.cookie) headers.Cookie = this.cookie;

		const req = new Request(`http://test.local${path}`, {
			method,
			headers,
			body: options?.body === undefined ? undefined : JSON.stringify(options.body),
		});

		const res = await this.handler(req);
		const text = await res.text();

		let data: T | null = null;
		if (text.length > 0) {
			const contentType = res.headers.get("Content-Type") || "";
			if (contentType.includes("application/json")) {
				data = JSON.parse(text) as T;
			} else {
				// Non-JSON response (e.g., plain text error messages)
				// Wrap in an object with code and message for consistency
				data = { code: res.statusText || "ERROR", message: text } as T;
			}
		}
		return { res, data };
	}
}

