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

describe("integration: QR-Pro-012 repair record", () => {
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

	test("POST /api/rework-tasks/:taskId/repair-record writes meta and trace exposes it", async () => {
		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const now = Date.now();
		const routingCode = `ROUTE-REPAIR-${now}`;
		const operationCode = `OP-REPAIR-${now}`;
		const woNo = `WO-REPAIR-${now}`;
		const runNo = `RUN-REPAIR-${now}`;
		const unitSn = `SN-REPAIR-${now}`;

		const dbClient = dbModule.createDbClient();
		try {
			const routing = await dbClient.routing.create({
				data: {
					code: routingCode,
					name: `Routing ${routingCode}`,
					sourceSystem: "MES",
					isActive: true,
				},
			});

			const operation = await dbClient.operation.create({
				data: {
					code: operationCode,
					name: `Operation ${operationCode}`,
					defaultType: dbModule.StationType.MANUAL,
				},
			});

			const routeVersion = await dbClient.executableRouteVersion.create({
				data: {
					routingId: routing.id,
					versionNo: 1,
					status: "READY",
					snapshotJson: {
						route: {
							code: routing.code,
							sourceSystem: routing.sourceSystem,
							sourceKey: routing.sourceKey,
						},
						steps: [
							{
								stepNo: 1,
								operationId: operation.id,
								stationType: "MANUAL",
								stationGroupId: null,
								allowedStationIds: [],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [],
							},
						],
					},
				},
			});

			const workOrder = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: `PROD-${now}`,
					plannedQty: 1,
					routingId: routing.id,
				},
			});

			const run = await dbClient.run.create({
				data: {
					runNo,
					woId: workOrder.id,
					planQty: 1,
					status: dbModule.RunStatus.AUTHORIZED,
					routeVersionId: routeVersion.id,
					startedAt: new Date(now - 1000),
				},
			});

			await dbClient.unit.create({
				data: {
					sn: unitSn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.OUT_FAILED,
					currentStepNo: 1,
				},
			});
		} finally {
			await dbClient.$disconnect();
		}

		const defectRes = await client.post<{ ok: boolean; data?: { id: string } }>(`/api/defects`, {
			unitSn,
			code: "DEFECT-REPAIR",
			location: "U1",
		});
		expect(defectRes.res.status).toBe(201);
		expect(defectRes.data?.ok).toBe(true);
		const defectId = defectRes.data?.data?.id;
		if (!defectId) throw new Error("Defect ID missing");

		const dispositionRes = await client.post<{
			ok: boolean;
			data?: { disposition?: { reworkTask?: { id: string } | null } | null };
		}>(`/api/defects/${defectId}/disposition`, {
			type: "REWORK",
			toStepNo: 1,
			reason: "repair-needed",
		});
		expect(dispositionRes.res.status).toBe(200);
		expect(dispositionRes.data?.ok).toBe(true);

		const reworkTaskId = dispositionRes.data?.data?.disposition?.reworkTask?.id;
		if (!reworkTaskId) throw new Error("Rework task ID missing");

		const recordRes = await client.post<{ ok: boolean }>(
			`/api/rework-tasks/${reworkTaskId}/repair-record`,
			{
				reason: "Solder bridge",
				action: "Rework and clean pads",
				result: "PASS",
				remark: "Manual touch-up",
			},
		);
		expect(recordRes.res.status).toBe(200);
		expect(recordRes.data?.ok).toBe(true);

		const traceRes = await client.get<{
			ok: boolean;
			data?: {
				defects: Array<{
					id: string;
					disposition?: {
						reworkTask?: {
							repairRecord?: { action: string; result: string; reason?: string };
						} | null;
					} | null;
				}>;
			};
		}>(`/api/trace/units/${unitSn}?mode=run`);

		expect(traceRes.res.status).toBe(200);
		expect(traceRes.data?.ok).toBe(true);
		const defect = traceRes.data?.data?.defects.find((item) => item.id === defectId);
		expect(defect).toBeTruthy();
		expect(defect?.disposition?.reworkTask?.repairRecord?.action).toBe("Rework and clean pads");
		expect(defect?.disposition?.reworkTask?.repairRecord?.result).toBe("PASS");
		expect(defect?.disposition?.reworkTask?.repairRecord?.reason).toBe("Solder bridge");
	});
});
