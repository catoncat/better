import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startTestServer, type TestAppHandle } from "../helpers/test-app";
import { setupTestDb, type TestDbHandle } from "../helpers/test-db";

/**
 * P0 Regression Test: MANUAL execution path
 *
 * Verifies that the traditional MANUAL TrackIn/TrackOut flow continues to work
 * after ingest automation features were added.
 *
 * Covers P0 criterion #4: "现有 MANUAL 执行路径与 test-mes-flow.ts 仍稳定通过（回归）"
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

describe("integration: mes MANUAL execution regression", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;
	let dbModule: typeof import("@better-app/db");

	type TraceUnitResponse = {
		ok: boolean;
		data: {
			unit: { sn: string; status: string };
			tracks: Array<{
				stepNo: number;
				operation: string | null;
				result: string | null;
				inAt: string | null;
				outAt: string | null;
			}>;
		};
	};

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

	test("MANUAL TrackIn + TrackOut with DataValue creates trace record", async () => {
		const client = new IntegrationClient(app.baseUrl);
		// Use operator user which has EXEC_TRACK_IN/OUT permissions
		await client.login("operator@example.com", process.env.SEED_TEST_PASSWORD || "Test123!");

		const now = Date.now();
		const runNo = `RUN-MANUAL-${now}`;
		const woNo = `WO-MANUAL-${now}`;
		const routingCode = `ROUTE-MANUAL-${now}`;
		const operationCode = `OP-MANUAL-${now}`;
		const stationCode = `STN-MANUAL-${now}`;
		const specName = `MEASURE-${now}`;
		const sn = `SN-MANUAL-${now}-0001`;

		const dbClient = dbModule.createDbClient();
		try {
			// Setup: Create routing with MANUAL station
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

			const stationGroup = await dbClient.stationGroup.create({
				data: {
					code: `GRP-${stationCode}`,
					name: `Group ${stationCode}`,
				},
			});

			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.MANUAL,
					groupId: stationGroup.id,
				},
			});

			const spec = await dbClient.dataCollectionSpec.create({
				data: {
					operationId: operation.id,
					name: specName,
					itemType: "KEY",
					dataType: "NUMBER",
					method: "MANUAL",
					triggerType: "EACH_UNIT",
					isRequired: true,
					isActive: true,
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
								groupId: stationGroup.id,
								allowedStationIds: [station.id],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [spec.id],
								ingestMapping: null,
							},
						],
					},
				},
			});

			const workOrder = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: "TEST-PRODUCT",
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
					status: dbModule.RunStatus.AUTHORIZED,
					planQty: 1,
				},
			});

			await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.QUEUED,
					currentStepNo: 1,
				},
			});

			// Test: TrackIn via API
			const trackInRes = await client.post<{ ok: boolean; data: { status: string } }>(
				`/api/stations/${stationCode}/track-in`,
				{ sn, woNo, runNo },
			);
			expect(trackInRes.res.status).toBe(200);
			expect(trackInRes.data?.ok).toBe(true);

			// Verify unit is IN_STATION
			const unitAfterIn = await dbClient.unit.findUnique({ where: { sn } });
			expect(unitAfterIn?.status).toBe(dbModule.UnitStatus.IN_STATION);

			// Test: TrackOut with data value
			const trackOutRes = await client.post<{ ok: boolean; data: { status: string } }>(
				`/api/stations/${stationCode}/track-out`,
				{
					sn,
					runNo,
					result: "PASS",
					data: [{ specName: specName, valueNumber: 42.5 }],
				},
			);
			expect(trackOutRes.res.status).toBe(200);
			expect(trackOutRes.data?.ok).toBe(true);

			// Verify unit is DONE (single step route)
			const unitAfterOut = await dbClient.unit.findUnique({ where: { sn } });
			expect(unitAfterOut?.status).toBe(dbModule.UnitStatus.DONE);

			// Verify Track record exists with DataValue
			const track = await dbClient.track.findFirst({
				where: { unitId: unitAfterOut?.id },
				orderBy: { createdAt: "desc" },
				include: { dataValues: true },
			});
			expect(track).not.toBeNull();
			expect(track?.result).toBe("PASS");
			expect(track?.dataValues).toHaveLength(1);
			expect(track?.dataValues[0]?.valueNumber).toBeCloseTo(42.5, 5);

			// Test: Trace API returns the execution record
			const { res: traceRes, data: traceData } = await client.get<TraceUnitResponse>(
				`/api/trace/units/${sn}?mode=run`,
			);
			expect(traceRes.status).toBe(200);
			expect(traceData?.ok).toBe(true);
			expect(traceData?.data.unit.sn).toBe(sn);
			expect(traceData?.data.unit.status).toBe("DONE");
			expect(traceData?.data.tracks).toHaveLength(1);
			expect(traceData?.data.tracks[0]?.stepNo).toBe(1);
			expect(traceData?.data.tracks[0]?.result).toBe("PASS");
		} finally {
			await dbClient.$disconnect();
		}
	});

	test("MANUAL TrackOut with FAIL outcome marks unit as OUT_FAILED", async () => {
		const client = new IntegrationClient(app.baseUrl);
		// Use operator user which has EXEC_TRACK_IN/OUT permissions
		await client.login("operator@example.com", process.env.SEED_TEST_PASSWORD || "Test123!");

		const now = Date.now();
		const runNo = `RUN-FAIL-${now}`;
		const woNo = `WO-FAIL-${now}`;
		const routingCode = `ROUTE-FAIL-${now}`;
		const operationCode = `OP-FAIL-${now}`;
		const stationCode = `STN-FAIL-${now}`;
		const sn = `SN-FAIL-${now}-0001`;

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

			const stationGroup = await dbClient.stationGroup.create({
				data: {
					code: `GRP-${stationCode}`,
					name: `Group ${stationCode}`,
				},
			});

			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.MANUAL,
					groupId: stationGroup.id,
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
								groupId: stationGroup.id,
								allowedStationIds: [station.id],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [],
								ingestMapping: null,
							},
						],
					},
				},
			});

			const workOrder = await dbClient.workOrder.create({
				data: {
					woNo,
					productCode: "TEST-PRODUCT",
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
					status: dbModule.RunStatus.AUTHORIZED,
					planQty: 1,
				},
			});

			await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.QUEUED,
					currentStepNo: 1,
				},
			});

			// TrackIn
			const trackInRes = await client.post<{ ok: boolean }>(
				`/api/stations/${stationCode}/track-in`,
				{
					sn,
					woNo,
					runNo,
				},
			);
			expect(trackInRes.res.status).toBe(200);

			// TrackOut with FAIL
			const trackOutRes = await client.post<{ ok: boolean }>(
				`/api/stations/${stationCode}/track-out`,
				{
					sn,
					runNo,
					result: "FAIL",
				},
			);
			expect(trackOutRes.res.status).toBe(200);
			expect(trackOutRes.data?.ok).toBe(true);

			// Verify unit is OUT_FAILED
			const unit = await dbClient.unit.findUnique({ where: { sn } });
			expect(unit?.status).toBe(dbModule.UnitStatus.OUT_FAILED);
		} finally {
			await dbClient.$disconnect();
		}
	});
});
