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
}

describe("integration: mes device data receive", () => {
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

	test("POST /api/integration/device-data writes DataValue and is idempotent (trackId path)", async () => {
		const now = Date.now();
		const uniq = `${now}-${Math.random().toString(16).slice(2)}`;

		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const runNo = `RUN-DEVICE-${uniq}`;
		const woNo = `WO-DEVICE-${uniq}`;
		const routingCode = `ROUTE-DEVICE-${uniq}`;
		const operationCode = `OP-DEVICE-${uniq}`;
		const stationCode = `ST-DEVICE-${uniq}`;
		const specName = `TEMP-DEVICE-${uniq}`;
		const sn = `SN-DEVICE-${uniq}`;

		const dbClient = dbModule.createDbClient();
		let specId = "";
		let trackId = "";

		try {
			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.AUTO,
				},
			});

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
					defaultType: dbModule.StationType.AUTO,
				},
			});

			const spec = await dbClient.dataCollectionSpec.create({
				data: {
					operationId: operation.id,
					name: specName,
					itemType: "KEY",
					dataType: "NUMBER",
					method: "AUTO",
					triggerType: "EACH_UNIT",
					isRequired: true,
					isActive: true,
				},
			});
			specId = spec.id;

			const routeVersion = await dbClient.executableRouteVersion.create({
				data: {
					routingId: routing.id,
					versionNo: 1,
					status: "READY",
					snapshotJson: {
						steps: [{ stepNo: 10, operationId: operation.id, dataSpecIds: [spec.id] }],
					},
				},
			});

			const workOrder = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: `PROD-${uniq}`,
					plannedQty: 1,
					status: "RELEASED",
					routingId: routing.id,
				},
			});

			const run = await dbClient.run.create({
				data: {
					runNo,
					woId: workOrder.id,
					routeVersionId: routeVersion.id,
					planQty: 1,
					status: dbModule.RunStatus.IN_PROGRESS,
					startedAt: new Date(now),
				},
			});

			const unit = await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.IN_STATION,
					currentStepNo: 10,
				},
			});

			const track = await dbClient.track.create({
				data: {
					unitId: unit.id,
					stepNo: 10,
					stationId: station.id,
					source: dbModule.TrackSource.MANUAL,
					inAt: new Date(now),
					outAt: new Date(now),
					result: dbModule.TrackResult.PASS,
				},
			});
			trackId = track.id;
		} finally {
			await dbClient.$disconnect();
		}

		type ReceiveResponse =
			| {
					ok: true;
					data: {
						id: string;
						eventId: string;
						trackId: string | null;
						carrierTrackId: string | null;
						dataValuesCreated: number;
						receivedAt: string;
						isDuplicate: boolean;
					};
			  }
			| { ok: false; error: { code: string; message: string } };

		const eventId = `evt-${uniq}`;
		const eventTime = new Date(now).toISOString();
		const body = {
			eventId,
			eventTime,
			source: "AUTO",
			trackId,
			data: [{ specName, valueNumber: 245, collectedAt: eventTime }],
			meta: { raw: "payload" },
		};

		const first = await client.post<ReceiveResponse>("/api/integration/device-data", body);
		expect(first.res.status).toBe(200);
		expect(first.data?.ok).toBe(true);
		expect((first.data as Extract<ReceiveResponse, { ok: true }>).data.isDuplicate).toBe(false);

		const dbVerify = dbModule.createDbClient();
		try {
			const record = await dbVerify.deviceDataRecord.findUnique({ where: { eventId } });
			expect(record).not.toBeNull();
			expect(record?.trackId).toBe(trackId);
			expect(record?.dataValuesCreated).toBe(1);

			const values = await dbVerify.dataValue.findMany({ where: { specId } });
			expect(values).toHaveLength(1);
			expect(values[0]?.source).toBe(dbModule.TrackSource.AUTO);
			expect(values[0]?.valueNumber).toBeCloseTo(245, 5);

			const second = await client.post<ReceiveResponse>("/api/integration/device-data", body);
			expect(second.res.status).toBe(200);
			expect(second.data?.ok).toBe(true);
			expect((second.data as Extract<ReceiveResponse, { ok: true }>).data.isDuplicate).toBe(true);

			const valuesAfter = await dbVerify.dataValue.findMany({ where: { specId } });
			expect(valuesAfter).toHaveLength(1);
		} finally {
			await dbVerify.$disconnect();
		}
	});

	test("POST /api/integration/device-data resolves Track by runNo/unitSn/stationCode/stepNo", async () => {
		const now = Date.now();
		const uniq = `${now}-${Math.random().toString(16).slice(2)}`;

		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const runNo = `RUN-DEVICE-RESOLVE-${uniq}`;
		const woNo = `WO-DEVICE-RESOLVE-${uniq}`;
		const routingCode = `ROUTE-DEVICE-RESOLVE-${uniq}`;
		const operationCode = `OP-DEVICE-RESOLVE-${uniq}`;
		const stationCode = `ST-DEVICE-RESOLVE-${uniq}`;
		const specName = `TEMP-DEVICE-RESOLVE-${uniq}`;
		const sn = `SN-DEVICE-RESOLVE-${uniq}`;

		const dbClient = dbModule.createDbClient();
		let specId = "";
		let stationId = "";
		let unitId = "";

		try {
			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.AUTO,
				},
			});
			stationId = station.id;

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
					defaultType: dbModule.StationType.AUTO,
				},
			});

			const spec = await dbClient.dataCollectionSpec.create({
				data: {
					operationId: operation.id,
					name: specName,
					itemType: "KEY",
					dataType: "NUMBER",
					method: "AUTO",
					triggerType: "EACH_UNIT",
					isRequired: true,
					isActive: true,
				},
			});
			specId = spec.id;

			const routeVersion = await dbClient.executableRouteVersion.create({
				data: {
					routingId: routing.id,
					versionNo: 1,
					status: "READY",
					snapshotJson: {
						steps: [{ stepNo: 10, operationId: operation.id, dataSpecIds: [spec.id] }],
					},
				},
			});

			const workOrder = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: `PROD-${uniq}`,
					plannedQty: 1,
					status: "RELEASED",
					routingId: routing.id,
				},
			});

			const run = await dbClient.run.create({
				data: {
					runNo,
					woId: workOrder.id,
					routeVersionId: routeVersion.id,
					planQty: 1,
					status: dbModule.RunStatus.IN_PROGRESS,
					startedAt: new Date(now),
				},
			});

			const unit = await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.IN_STATION,
					currentStepNo: 10,
				},
			});
			unitId = unit.id;

			await dbClient.track.create({
				data: {
					unitId: unit.id,
					stepNo: 10,
					stationId: station.id,
					source: dbModule.TrackSource.MANUAL,
					inAt: new Date(now),
					outAt: new Date(now),
					result: dbModule.TrackResult.PASS,
				},
			});
		} finally {
			await dbClient.$disconnect();
		}

		type ReceiveResponse =
			| {
					ok: true;
					data: {
						id: string;
						eventId: string;
						trackId: string | null;
						carrierTrackId: string | null;
						dataValuesCreated: number;
						receivedAt: string;
						isDuplicate: boolean;
					};
			  }
			| { ok: false; error: { code: string; message: string } };

		const eventId = `evt-resolve-${uniq}`;
		const eventTime = new Date(now).toISOString();
		const body = {
			eventId,
			eventTime,
			source: "AUTO",
			runNo,
			unitSn: sn,
			stationCode,
			stepNo: 10,
			data: [{ specName, valueNumber: 123.4, collectedAt: eventTime }],
		};

		const res = await client.post<ReceiveResponse>("/api/integration/device-data", body);
		expect(res.res.status).toBe(200);
		expect(res.data?.ok).toBe(true);
		expect((res.data as Extract<ReceiveResponse, { ok: true }>).data.isDuplicate).toBe(false);

		const dbVerify = dbModule.createDbClient();
		try {
			const record = await dbVerify.deviceDataRecord.findUnique({ where: { eventId } });
			expect(record).not.toBeNull();
			expect(record?.runNo).toBe(runNo);
			expect(record?.unitSn).toBe(sn);
			expect(record?.stationCode).toBe(stationCode);
			expect(record?.stepNo).toBe(10);
			expect(record?.dataValuesCreated).toBe(1);

			const values = await dbVerify.dataValue.findMany({ where: { specId } });
			expect(values).toHaveLength(1);
			expect(values[0]?.trackId).not.toBeNull();
			expect(values[0]?.source).toBe(dbModule.TrackSource.AUTO);

			const trackCount = await dbVerify.track.count({ where: { unitId, stationId, stepNo: 10 } });
			expect(trackCount).toBe(1);
		} finally {
			await dbVerify.$disconnect();
		}
	});
});
