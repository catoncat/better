import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { App } from "../../app";
import { TestApiClient } from "../helpers/test-api-client";
import { setupTestDb, type TestDbHandle } from "../helpers/test-db";

describe("integration: auth + permission", () => {
	let db: TestDbHandle;
	let api: App;

	beforeAll(async () => {
		db = await setupTestDb({ prefix: "integration", seed: true });

		process.env.DATABASE_URL = db.databaseUrl;
		process.env.DISABLE_CRONS = "true";
		process.env.TIME_RULE_CRON_ENABLED = "false";
		process.env.MES_INTEGRATION_CRON_ENABLED = "false";
		process.env.AUDIT_ARCHIVE_ENABLED = "false";

		const server = await import("../../app");
		api = server.createApi({ enableCors: false, enableCrons: false });
	});

	afterAll(async () => {
		await api?.stop?.();
		await db?.cleanup();
	});

	test("GET /api/roles → 401 when unauthenticated", async () => {
		const anon = new TestApiClient((req) => api.handle(req));
		const { res, data } = await anon.get<{ code: string; message: string }>("/api/roles");

		expect(res.status).toBe(401);
		expect(data?.code).toBe("UNAUTHORIZED");
	});

	test("GET /api/roles → 403 when missing permission", async () => {
		const operator = new TestApiClient((req) => api.handle(req));
		await operator.login("operator@example.com", process.env.SEED_TEST_PASSWORD || "Test123!");

		const { res, data } = await operator.get<{ code: string; message: string }>("/api/roles");
		expect(res.status).toBe(403);
		expect(data?.code).toBe("FORBIDDEN");
	});

	test("GET /api/roles → 200 for admin", async () => {
		const admin = new TestApiClient((req) => api.handle(req));
		await admin.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const { res, data } = await admin.get<{ ok: boolean }>("/api/roles");
		expect(res.status).toBe(200);
		expect(data?.ok).toBe(true);
	});
});

