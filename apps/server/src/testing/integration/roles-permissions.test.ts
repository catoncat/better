import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startTestServer, type TestAppHandle } from "../helpers/test-app";
import { setupTestDb, type TestDbHandle } from "../helpers/test-db";

/**
 * HTTP client for integration tests that hit a real server subprocess.
 */
class IntegrationClient {
	private cookie = "";

	constructor(private readonly baseUrl: string) {}

	async login(email: string, password: string) {
		const res = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Login failed: ${res.status} ${text}`);
		}

		const rawCookie = res.headers.get("set-cookie") || "";
		this.cookie = rawCookie.split(";")[0] || "";
		if (!this.cookie) {
			throw new Error("Login succeeded but session cookie is missing");
		}
	}

	async get<T>(path: string): Promise<{ res: Response; data: T | null }> {
		const headers: Record<string, string> = {};
		if (this.cookie) headers.Cookie = this.cookie;

		const res = await fetch(`${this.baseUrl}${path}`, { headers });
		const text = await res.text();

		let data: T | null = null;
		if (text.length > 0) {
			try {
				data = JSON.parse(text) as T;
			} catch {
				data = { code: res.statusText || "ERROR", message: text } as T;
			}
		}
		return { res, data };
	}
}

describe("integration: auth + permission", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;

	beforeAll(async () => {
		db = await setupTestDb({ prefix: "integration", seed: true });
		app = await startTestServer(db);
	});

	afterAll(async () => {
		await app?.stop();
		await db?.cleanup();
	});

	test("GET /api/roles → 401 when unauthenticated", async () => {
		const anon = new IntegrationClient(app.baseUrl);
		const { res, data } = await anon.get<{ code: string; message: string }>("/api/roles");

		expect(res.status).toBe(401);
		expect(data?.code).toBe("UNAUTHORIZED");
	});

	test("GET /api/roles → 403 when missing permission", async () => {
		const operator = new IntegrationClient(app.baseUrl);
		await operator.login("operator@example.com", process.env.SEED_TEST_PASSWORD || "Test123!");

		const { res, data } = await operator.get<{ code: string; message: string }>("/api/roles");
		expect(res.status).toBe(403);
		expect(data?.code).toBe("FORBIDDEN");
	});

	test("GET /api/roles → 200 for admin", async () => {
		const admin = new IntegrationClient(app.baseUrl);
		await admin.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const { res, data } = await admin.get<{ ok: boolean }>("/api/roles");
		expect(res.status).toBe(200);
		expect(data?.ok).toBe(true);
	});
});
