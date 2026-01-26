import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startTestServer, type TestAppHandle } from "../helpers/test-app";
import { setupTestDb, type TestDbHandle } from "../helpers/test-db";

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

	async post<T>(path: string, body: unknown): Promise<{ res: Response; data: T | null }> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (this.cookie) headers.Cookie = this.cookie;

		const res = await fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
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

describe("integration: outbound feedback - enqueue/list/retry", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;
	let dbModule: typeof import("@better-app/db");

	beforeAll(async () => {
		db = await setupTestDb({ prefix: "integration", seed: true });
		process.env.DATABASE_URL = db.databaseUrl;
		dbModule = await import("@better-app/db");
		app = await startTestServer(db);
	});

	afterAll(async () => {
		await dbModule?.default?.$disconnect();
		await app?.stop();
		await db?.cleanup();
	});

	test("POST /api/integration/outbound/erp/runs/:runNo/completion enqueues a MesEvent and is idempotent", async () => {
		const now = Date.now();
		const runNo = `RUN-OUTBOUND-${now}`;
		const woNo = `WO-OUTBOUND-${now}`;

		const dbClient = dbModule.createDbClient();
		try {
			const wo = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: `PROD-${now}`,
					plannedQty: 4,
				},
			});
			const run = await dbClient.run.create({
				data: {
					runNo,
					woId: wo.id,
					planQty: 4,
					status: dbModule.RunStatus.COMPLETED,
					startedAt: new Date(now - 60_000),
					endedAt: new Date(now),
				},
			});

			await dbClient.unit.createMany({
				data: [
					{ sn: `SN-${now}-1`, woId: wo.id, runId: run.id, status: dbModule.UnitStatus.DONE },
					{ sn: `SN-${now}-2`, woId: wo.id, runId: run.id, status: dbModule.UnitStatus.DONE },
					{ sn: `SN-${now}-3`, woId: wo.id, runId: run.id, status: dbModule.UnitStatus.DONE },
					{
						sn: `SN-${now}-4`,
						woId: wo.id,
						runId: run.id,
						status: dbModule.UnitStatus.SCRAPPED,
					},
				],
			});

			const client = new IntegrationClient(app.baseUrl);
			await client.login(
				process.env.SEED_ADMIN_EMAIL || "admin@example.com",
				process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
			);

			type EnqueueResponse =
				| { ok: true; data: { eventId: string; idempotencyKey: string } }
				| { ok: false; error: { code: string; message: string } };

			const first = await client.post<EnqueueResponse>(
				`/api/integration/outbound/erp/runs/${runNo}/completion`,
				{},
			);
			expect(first.res.status).toBe(200);
			expect(first.data?.ok).toBe(true);
			const firstData = (
				first.data as { ok: true; data: { eventId: string; idempotencyKey: string } }
			).data;

			const second = await client.post<EnqueueResponse>(
				`/api/integration/outbound/erp/runs/${runNo}/completion`,
				{},
			);
			expect(second.res.status).toBe(200);
			expect(second.data?.ok).toBe(true);
			const secondData = (
				second.data as { ok: true; data: { eventId: string; idempotencyKey: string } }
			).data;

			expect(secondData.eventId).toBe(firstData.eventId);
			expect(secondData.idempotencyKey).toBe(firstData.idempotencyKey);

			type ListResponse = {
				ok: true;
				data: {
					items: Array<{
						id: string;
						eventType: string;
						status: string;
						attempts: number;
						idempotencyKey: string | null;
						payload: unknown;
					}>;
				};
			};

			const list = await client.get<ListResponse>(`/api/integration/outbound/events?limit=50`);
			expect(list.res.status).toBe(200);
			expect(list.data?.ok).toBe(true);

			const match = list.data?.data.items.find((item) => item.id === firstData.eventId) ?? null;
			expect(match).not.toBeNull();
			expect(match?.eventType).toBe("OUTBOUND_FEEDBACK");
			expect(match?.idempotencyKey).toBe(firstData.idempotencyKey);
			expect(match?.status).toBe("PENDING");
		} finally {
			await dbClient.$disconnect();
		}
	});

	test("POST /api/integration/outbound/events/:id/retry resets FAILED event to PENDING", async () => {
		const now = Date.now();
		const runNo = `RUN-OUTBOUND-RETRY-${now}`;
		const woNo = `WO-OUTBOUND-RETRY-${now}`;

		const dbClient = dbModule.createDbClient();
		try {
			const wo = await dbClient.workOrder.create({
				data: { woNo, productCode: `PROD-${now}`, plannedQty: 1 },
			});
			await dbClient.run.create({
				data: {
					runNo,
					woId: wo.id,
					planQty: 1,
					status: dbModule.RunStatus.COMPLETED,
					endedAt: new Date(now),
				},
			});

			const client = new IntegrationClient(app.baseUrl);
			await client.login(
				process.env.SEED_ADMIN_EMAIL || "admin@example.com",
				process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
			);

			type EnqueueResponse =
				| { ok: true; data: { eventId: string; idempotencyKey: string } }
				| { ok: false; error: { code: string; message: string } };

			const enqueue = await client.post<EnqueueResponse>(
				`/api/integration/outbound/erp/runs/${runNo}/completion`,
				{},
			);
			expect(enqueue.res.status).toBe(200);
			const eventId = (enqueue.data as { ok: true; data: { eventId: string } }).data.eventId;

			await dbClient.mesEvent.update({
				where: { id: eventId },
				data: {
					status: dbModule.MesEventStatus.FAILED,
					attempts: 5,
					errorMessage: "boom",
					nextAttemptAt: null,
				},
			});

			type RetryResponse =
				| { ok: true; data: { eventId: string; status: string; nextAttemptAt: string | null } }
				| { ok: false; error: { code: string; message: string } };

			const retry = await client.post<RetryResponse>(
				`/api/integration/outbound/events/${eventId}/retry`,
				{},
			);
			expect(retry.res.status).toBe(200);
			expect(retry.data?.ok).toBe(true);

			const updated = await dbClient.mesEvent.findUnique({ where: { id: eventId } });
			expect(updated?.status).toBe(dbModule.MesEventStatus.PENDING);
			expect(updated?.attempts).toBe(0);
			expect(updated?.nextAttemptAt).not.toBeNull();
		} finally {
			await dbClient.$disconnect();
		}
	});
});
