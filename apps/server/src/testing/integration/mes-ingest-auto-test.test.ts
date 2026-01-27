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

describe("integration: mes ingest AUTO/TEST execution + trace", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;
	let dbModule: typeof import("@better-app/db");

	type TraceUnitResponse = {
		ok: boolean;
		data: {
			routeVersion: { id: string };
			ingestEvents: Array<{
				dedupeKey: string;
				eventType: string;
				sourceSystem: string;
				stationCode: string | null;
				sn: string | null;
				links: { unitTracks: Record<string, string> | null } | null;
			}>;
			dataValues: Array<{
				name: string;
				valueNumber: number | null;
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

	test("POST /api/ingest/events (AUTO) writes Track/DataValue and is idempotent; trace exposes ingestEvents + routeVersion", async () => {
		const now = Date.now();
		const uniq = `${now}-${Math.random().toString(16).slice(2)}`;

		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const runNo = `RUN-AUTO-${uniq}`;
		const woNo = `WO-AUTO-${uniq}`;
		const routingCode = `ROUTE-AUTO-${uniq}`;
		const operationCode = `OP-AUTO-${uniq}`;
		const stationCode = `ST-AUTO-${uniq}`;
		const specName = `TEMP-AUTO-${uniq}`;
		const sn = `SN-AUTO-${uniq}`;

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
			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.AUTO,
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
								stationType: "AUTO",
								stationGroupId: null,
								allowedStationIds: [],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [spec.id],
								ingestMapping: {
									eventType: "AUTO",
									stationCodePath: "payload.stationCode",
									snPath: "payload.sn",
									result: { path: "payload.result", passValues: ["PASS"], failValues: ["FAIL"] },
									measurements: {
										itemsPath: "payload.measurements",
										namePath: "name",
										valuePath: "value",
										unitPath: "unit",
										judgePath: "judge",
									},
								},
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
			const unit = await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.QUEUED,
					currentStepNo: 1,
				},
			});

			const dedupeKey = `auto-${uniq}`;
			const occurredAt = new Date(now).toISOString();
			const payload = {
				stationCode: station.code,
				sn,
				result: "PASS",
				measurements: [{ name: specName, value: 55.5, unit: "C", judge: "PASS" }],
			};
			const body = {
				dedupeKey,
				sourceSystem: "TESTSYS",
				eventType: "AUTO",
				occurredAt,
				runNo: run.runNo,
				payload,
			};

			const first = await client.post<{
				ok: boolean;
				data: { eventId: string; duplicate: boolean };
			}>("/api/ingest/events", body);
			expect(first.res.status).toBe(200);
			expect(first.data?.ok).toBe(true);
			expect(first.data?.data.duplicate).toBe(false);

			const second = await client.post<{
				ok: boolean;
				data: { eventId: string; duplicate: boolean };
			}>("/api/ingest/events", body);
			expect(second.res.status).toBe(200);
			expect(second.data?.ok).toBe(true);
			expect(second.data?.data.duplicate).toBe(true);

			const ingestEventCount = await dbClient.ingestEvent.count({
				where: { sourceSystem: "TESTSYS", dedupeKey },
			});
			expect(ingestEventCount).toBe(1);

			const tracks = await dbClient.track.findMany({ where: { unitId: unit.id } });
			expect(tracks).toHaveLength(1);
			expect(tracks[0]?.source).toBe(dbModule.TrackSource.AUTO);

			const dataValueCount = tracks[0]
				? await dbClient.dataValue.count({ where: { trackId: tracks[0].id } })
				: 0;
			expect(dataValueCount).toBe(1);

			const { res: traceRes, data: traceData } = await client.get<TraceUnitResponse>(
				`/api/trace/units/${sn}?mode=run`,
			);
			expect(traceRes.status).toBe(200);
			expect(traceData?.ok).toBe(true);
			if (!traceData || !traceData.ok) throw new Error("Trace response missing ok/data");

			expect(traceData.data.routeVersion.id).toBe(routeVersion.id);

			const event = traceData.data.ingestEvents.find((e) => e.dedupeKey === dedupeKey);
			expect(event?.eventType).toBe("AUTO");
			expect(event?.sourceSystem).toBe("TESTSYS");
			expect(event?.stationCode).toBe(stationCode);
			expect(event?.sn).toBe(sn);
			expect(event?.links).toBeNull();

			const traceValue = traceData.data.dataValues.find((v) => v.name === specName);
			expect(traceValue?.valueNumber).toBeCloseTo(55.5, 5);
		} finally {
			await dbClient.$disconnect();
		}
	});

	test("POST /api/ingest/events (TEST) requires testResultId, writes Track/DataValue and is idempotent; trace exposes ingestEvents + routeVersion", async () => {
		const now = Date.now();
		const uniq = `${now}-${Math.random().toString(16).slice(2)}`;

		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const runNo = `RUN-TEST-${uniq}`;
		const woNo = `WO-TEST-${uniq}`;
		const routingCode = `ROUTE-TEST-${uniq}`;
		const operationCode = `OP-TEST-${uniq}`;
		const stationCode = `ST-TEST-${uniq}`;
		const specName = `TEMP-TEST-${uniq}`;
		const sn = `SN-TEST-${uniq}`;
		const testResultId = `TR-${uniq}`;

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
					defaultType: dbModule.StationType.TEST,
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
			const station = await dbClient.station.create({
				data: {
					code: stationCode,
					name: `Station ${stationCode}`,
					stationType: dbModule.StationType.TEST,
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
								stationType: "TEST",
								stationGroupId: null,
								allowedStationIds: [],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [spec.id],
								ingestMapping: {
									eventType: "TEST",
									stationCodePath: "payload.stationCode",
									snPath: "payload.sn",
									testResultIdPath: "payload.testResultId",
									result: { path: "payload.result", passValues: ["PASS"], failValues: ["FAIL"] },
									measurements: {
										itemsPath: "payload.measurements",
										namePath: "name",
										valuePath: "value",
										unitPath: "unit",
										judgePath: "judge",
									},
								},
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
			const unit = await dbClient.unit.create({
				data: {
					sn,
					woId: workOrder.id,
					runId: run.id,
					status: dbModule.UnitStatus.QUEUED,
					currentStepNo: 1,
				},
			});

			const dedupeKey = `test-${uniq}`;
			const occurredAt = new Date(now).toISOString();
			const payload = {
				stationCode: station.code,
				sn,
				testResultId,
				result: "PASS",
				measurements: [{ name: specName, value: 99.9, unit: "C", judge: "PASS" }],
			};
			const body = {
				dedupeKey,
				sourceSystem: "TESTSYS",
				eventType: "TEST",
				occurredAt,
				runNo: run.runNo,
				payload,
			};

			const first = await client.post<{
				ok: boolean;
				data: { eventId: string; duplicate: boolean };
			}>("/api/ingest/events", body);
			expect(first.res.status).toBe(200);
			expect(first.data?.ok).toBe(true);
			expect(first.data?.data.duplicate).toBe(false);

			const second = await client.post<{
				ok: boolean;
				data: { eventId: string; duplicate: boolean };
			}>("/api/ingest/events", body);
			expect(second.res.status).toBe(200);
			expect(second.data?.ok).toBe(true);
			expect(second.data?.data.duplicate).toBe(true);

			const ingestEventCount = await dbClient.ingestEvent.count({
				where: { sourceSystem: "TESTSYS", dedupeKey },
			});
			expect(ingestEventCount).toBe(1);

			const tracks = await dbClient.track.findMany({ where: { unitId: unit.id } });
			expect(tracks).toHaveLength(1);
			expect(tracks[0]?.source).toBe(dbModule.TrackSource.TEST);

			const dataValueCount = tracks[0]
				? await dbClient.dataValue.count({ where: { trackId: tracks[0].id } })
				: 0;
			expect(dataValueCount).toBe(1);

			const { res: traceRes, data: traceData } = await client.get<TraceUnitResponse>(
				`/api/trace/units/${sn}?mode=run`,
			);
			expect(traceRes.status).toBe(200);
			expect(traceData?.ok).toBe(true);
			if (!traceData || !traceData.ok) throw new Error("Trace response missing ok/data");

			expect(traceData.data.routeVersion.id).toBe(routeVersion.id);

			const event = traceData.data.ingestEvents.find((e) => e.dedupeKey === dedupeKey);
			expect(event?.eventType).toBe("TEST");
			expect(event?.sourceSystem).toBe("TESTSYS");
			expect(event?.stationCode).toBe(stationCode);
			expect(event?.sn).toBe(sn);
			expect(event?.links).toBeNull();

			const traceValue = traceData.data.dataValues.find((v) => v.name === specName);
			expect(traceValue?.valueNumber).toBeCloseTo(99.9, 5);
		} finally {
			await dbClient.$disconnect();
		}
	});
});
