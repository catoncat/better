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

describe("integration: mes ingest BATCH execution + trace", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;
	let dbModule: typeof import("@better-app/db");

	type TraceUnitResponse = {
		ok: boolean;
		data: {
			ingestEvents: Array<{
				dedupeKey: string;
				snList: string[] | null;
				links: {
					carrierTrackId: string | null;
					unitTracks: Record<string, string> | null;
				} | null;
			}>;
			carrierTracks: Array<{
				carrierNo: string;
				dataValueCount: number;
			}>;
			carrierDataValues: Array<{
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

	test("POST /api/ingest/events (BATCH) writes CarrierTrack/DataValue + trace exposes links", async () => {
		const client = new IntegrationClient(app.baseUrl);
		await client.login(
			process.env.SEED_ADMIN_EMAIL || "admin@example.com",
			process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
		);

		const now = Date.now();
		const runNo = `RUN-BATCH-${now}`;
		const woNo = `WO-BATCH-${now}`;
		const routingCode = `ROUTE-BATCH-${now}`;
		const operationCode = `OP-BATCH-${now}`;
		const carrierNo = `CARRIER-${now}`;
		const specName = `TEMP-${now}`;

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
					defaultType: dbModule.StationType.BATCH,
				},
			});

			const spec = await dbClient.dataCollectionSpec.create({
				data: {
					operationId: operation.id,
					name: specName,
					itemType: "KEY",
					dataType: "NUMBER",
					method: "AUTO",
					triggerType: "EACH_CARRIER",
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
								stationType: "BATCH",
								stationGroupId: null,
								allowedStationIds: [],
								requiresFAI: false,
								requiresAuthorization: false,
								dataSpecIds: [spec.id],
								ingestMapping: {
									eventType: "BATCH",
									carrierCodePath: "payload.carrierCode",
									snListPath: "payload.snList",
									result: { path: "payload.result", passValues: ["PASS"], failValues: ["FAIL"] },
									measurements: {
										itemsPath: "payload.measurements",
										namePath: "name",
										valuePath: "value",
										unitPath: "unit",
										judgePath: "judge",
									},
									batchPolicy: "ALL_OR_NOTHING",
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
					plannedQty: 2,
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
					planQty: 2,
				},
			});

			const sn1 = `SN-BATCH-${now}-0001`;
			const sn2 = `SN-BATCH-${now}-0002`;
			await dbClient.unit.createMany({
				data: [
					{
						sn: sn1,
						woId: workOrder.id,
						runId: run.id,
						status: dbModule.UnitStatus.QUEUED,
						currentStepNo: 1,
					},
					{
						sn: sn2,
						woId: workOrder.id,
						runId: run.id,
						status: dbModule.UnitStatus.QUEUED,
						currentStepNo: 1,
					},
				],
			});

			const dedupeKey = `batch-${now}`;
			const occurredAt = new Date(now).toISOString();

			const payload = {
				carrierCode: carrierNo,
				snList: [sn1, sn2],
				result: "PASS",
				measurements: [{ name: specName, value: 123.4, unit: "C", judge: "PASS" }],
			};

			const body = {
				dedupeKey,
				sourceSystem: "TESTSYS",
				eventType: "BATCH",
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

			const carrier = await dbClient.carrier.findUnique({ where: { carrierNo } });
			expect(carrier).not.toBeNull();

			const carrierTrackCount = carrier
				? await dbClient.carrierTrack.count({ where: { carrierId: carrier.id } })
				: 0;
			expect(carrierTrackCount).toBe(1);

			const units = await dbClient.unit.findMany({ where: { sn: { in: [sn1, sn2] } } });
			expect(units).toHaveLength(2);
			expect(units.every((u) => u.status === dbModule.UnitStatus.DONE)).toBe(true);

			const unitTrackCount = await dbClient.track.count({
				where: { unitId: { in: units.map((u) => u.id) } },
			});
			expect(unitTrackCount).toBe(2);

			const carrierTrack = carrier
				? await dbClient.carrierTrack.findFirst({
						where: { carrierId: carrier.id },
						orderBy: { createdAt: "desc" },
					})
				: null;
			expect(carrierTrack).not.toBeNull();

			const carrierDataValueCount = carrierTrack
				? await dbClient.dataValue.count({ where: { carrierTrackId: carrierTrack.id } })
				: 0;
			expect(carrierDataValueCount).toBe(1);

			const { res: traceRes, data: traceData } = await client.get<TraceUnitResponse>(
				`/api/trace/units/${sn1}?mode=run`,
			);
			expect(traceRes.status).toBe(200);
			expect(traceData?.ok).toBe(true);
			if (!traceData || !traceData.ok) {
				throw new Error("Trace response missing ok/data");
			}

			const event = traceData.data.ingestEvents.find((e) => e.dedupeKey === dedupeKey);
			expect(event).not.toBeUndefined();
			expect(event?.snList).toEqual([sn1, sn2]);
			expect(typeof event?.links?.carrierTrackId).toBe("string");
			expect(typeof event?.links?.unitTracks?.[sn1]).toBe("string");

			const traceCarrierTrack = traceData.data.carrierTracks.find((t) => t.carrierNo === carrierNo);
			expect(traceCarrierTrack?.dataValueCount).toBeGreaterThanOrEqual(1);

			const traceCarrierValue = traceData.data.carrierDataValues.find((v) => v.name === specName);
			expect(traceCarrierValue?.valueNumber).toBeCloseTo(123.4, 5);
		} finally {
			await dbClient.$disconnect();
		}
	});
});
