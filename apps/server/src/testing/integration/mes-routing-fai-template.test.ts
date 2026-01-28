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

	async patch<T>(path: string, body: unknown): Promise<{ res: Response; data: T | null }> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (this.cookie) headers.Cookie = this.cookie;

		const res = await fetch(`${this.baseUrl}${path}`, {
			method: "PATCH",
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

describe("integration: mes routing + FAI template", () => {
	let db: TestDbHandle;
	let app: TestAppHandle;
	let dbModule: typeof import("@better-app/db");
	let prisma: import("@better-app/db").PrismaClient;

	beforeAll(async () => {
		db = await setupTestDb({ prefix: "integration", seed: true });
		process.env.DATABASE_URL = db.databaseUrl;
		dbModule = await import("@better-app/db");
		prisma = dbModule.createDbClient();
		app = await startTestServer(db);
	});

	afterAll(async () => {
		await prisma?.$disconnect();
		await dbModule?.default?.$disconnect();
		await app?.stop();
		await db?.cleanup();
	});

	test("route compile embeds FAI template snapshot; FAI creation creates template items; gate requires FAI when step requires", async () => {
		const testPassword = process.env.SEED_TEST_PASSWORD || "Test123!";

		const quality = new IntegrationClient(app.baseUrl);
		await quality.login("quality@example.com", testPassword);

		const engineer = new IntegrationClient(app.baseUrl);
		await engineer.login("engineer@example.com", testPassword);

		const now = Date.now();
		const productCode = `PROD-FAI-${now}`;
		const routingCode = `ROUTE-FAI-${now}`;
		const operationCode = `OP-FAI-${now}`;
		const stationGroupCode = `GRP-FAI-${now}`;
		const templateCode = `FAI-TPL-${now}`;

		const stationGroup = await prisma.stationGroup.create({
			data: {
				code: stationGroupCode,
				name: `Station Group ${stationGroupCode}`,
			},
		});

		const operation = await prisma.operation.create({
			data: {
				code: operationCode,
				name: `Operation ${operationCode}`,
				defaultType: dbModule.StationType.MANUAL,
			},
		});

		const routing = await prisma.routing.create({
			data: {
				code: routingCode,
				name: `Routing ${routingCode}`,
				sourceSystem: "MES",
				productCode,
				processType: "SMT",
				isActive: true,
			},
		});

		await prisma.routingStep.create({
			data: {
				routingId: routing.id,
				stepNo: 10,
				operationId: operation.id,
				stationGroupId: stationGroup.id,
				stationType: dbModule.StationType.MANUAL,
				requiresFAI: true,
				isLast: true,
			},
		});

		type CreateTemplateResponse = {
			ok: boolean;
			data: { id: string };
		};

		const { res: createTemplateRes, data: createTemplateData } = await quality.post<CreateTemplateResponse>(
			"/api/fai-templates/",
			{
				code: templateCode,
				name: `FAI Template ${templateCode}`,
				productCode,
				processType: "SMT",
				isActive: true,
				items: [
					{ seq: 1, itemName: "Length", itemSpec: "10±0.5", required: true },
					{ seq: 2, itemName: "Width", itemSpec: "5±0.2", required: false },
				],
			},
		);

		expect(createTemplateRes.status).toBe(201);
		expect(createTemplateData?.ok).toBe(true);
		const templateId = createTemplateData?.data?.id;
		expect(typeof templateId).toBe("string");

		const { res: bindRes } = await engineer.patch<{ ok: boolean }>(
			`/api/routes/${routingCode}/fai-template`,
			{ faiTemplateId: templateId },
		);
		expect(bindRes.status).toBe(200);

		type CompileResponse = {
			ok: boolean;
			data: { id: string; status: string };
		};
		const { res: compileRes, data: compileData } = await engineer.post<CompileResponse>(
			`/api/routes/${routingCode}/compile`,
			{},
		);

		expect(compileRes.status).toBe(200);
		expect(compileData?.ok).toBe(true);
		expect(compileData?.data?.status).toBe("READY");

		const routeVersionId = compileData?.data?.id;
		expect(typeof routeVersionId).toBe("string");

		const routeVersion = await prisma.executableRouteVersion.findUnique({
			where: { id: routeVersionId },
			select: { snapshotJson: true },
		});
		const snapshot = routeVersion?.snapshotJson as {
			route?: { faiTemplate?: { id?: string; items?: Array<{ itemName?: string }> } };
		} | null;

		expect(snapshot?.route?.faiTemplate?.id).toBe(templateId);
		expect(snapshot?.route?.faiTemplate?.items?.map((item) => item.itemName)).toEqual(
			expect.arrayContaining(["Length", "Width"]),
		);

		const woNo = `WO-FAI-${now}`;
		const runNo = `RUN-FAI-${now}`;

		const workOrder = await prisma.workOrder.create({
			data: {
				woNo,
				productCode,
				plannedQty: 1,
				routingId: routing.id,
				status: dbModule.WorkOrderStatus.RELEASED,
			},
		});

		const run = await prisma.run.create({
			data: {
				runNo,
				woId: workOrder.id,
				planQty: 1,
				status: dbModule.RunStatus.PREP,
				routeVersionId,
			},
		});

		await prisma.unit.create({
			data: {
				sn: `SN-FAI-${now}-0001`,
				woId: workOrder.id,
				runId: run.id,
			},
		});

		await prisma.readinessCheck.create({
			data: {
				runId: run.id,
				type: "FORMAL",
				status: "PASSED",
			},
		});

		type GateResponse = {
			ok: boolean;
			data: { requiresFai: boolean; faiPassed: boolean; faiSigned: boolean };
		};
		const { res: gateRes, data: gateData } = await quality.get<GateResponse>(
			`/api/fai/run/${runNo}/gate`,
		);
		expect(gateRes.status).toBe(200);
		expect(gateData?.ok).toBe(true);
		expect(gateData?.data?.requiresFai).toBe(true);
		expect(gateData?.data?.faiPassed).toBe(false);
		expect(gateData?.data?.faiSigned).toBe(false);

		type CreateFaiResponse = {
			ok: boolean;
			data: { id: string };
		};
		const { res: createFaiRes, data: createFaiData } = await quality.post<CreateFaiResponse>(
			`/api/fai/run/${runNo}`,
			{ sampleQty: 1, remark: "test" },
		);
		expect(createFaiRes.status).toBe(201);
		expect(createFaiData?.ok).toBe(true);

		const faiId = createFaiData?.data?.id;
		expect(typeof faiId).toBe("string");

		type GetFaiResponse = {
			ok: boolean;
			data: { items: Array<{ itemName: string; itemSpec: string | null }> };
		};
		const { res: getFaiRes, data: getFaiData } = await quality.get<GetFaiResponse>(`/api/fai/${faiId}`);
		expect(getFaiRes.status).toBe(200);
		expect(getFaiData?.ok).toBe(true);
		expect(getFaiData?.data?.items.map((item) => item.itemName)).toEqual(
			expect.arrayContaining(["Length", "Width"]),
		);
	});

	test("ERP work order sync does not overwrite meta.routingOverride", async () => {
		const { applyWorkOrders } = await import("../../modules/mes/integration/erp/apply-work-orders");

		const now = Date.now();
		const productCode = `PROD-ERP-${now}`;

		const routingOverride = await prisma.routing.create({
			data: {
				code: `ROUTE-OVERRIDE-${now}`,
				name: `Override Route ${now}`,
				sourceSystem: "MES",
				productCode,
				processType: "SMT",
				isActive: true,
			},
		});

		const routingFromErp = await prisma.routing.create({
			data: {
				code: `ROUTE-ERP-${now}`,
				name: `ERP Route ${now}`,
				sourceSystem: "ERP",
				productCode,
				processType: "SMT",
				isActive: true,
			},
		});

		const woNo = `WO-ERP-${now}`;
		await prisma.workOrder.create({
			data: {
				woNo,
				productCode,
				plannedQty: 10,
				routingId: routingOverride.id,
				meta: {
					routingOverride: {
						routingId: routingOverride.id,
						routingCode: routingOverride.code,
						updatedBy: "test",
						updatedAt: new Date().toISOString(),
					},
				},
			},
		});

		await prisma.$transaction(async (tx) => {
			await applyWorkOrders(
				tx,
				[
					{
						woNo,
						productCode,
						productName: "Test Product",
						productSpec: "Spec",
						plannedQty: 10,
						unitCode: "PCS",
						unitName: "pcs",
						workshopCode: "WS",
						workshopName: "Workshop",
						routingCode: routingFromErp.code,
						routingName: "ERP Routing",
						status: "2",
						pickStatus: "0",
						priority: "0",
						srcBillNo: "SRC",
						rptFinishQty: 0,
						scrapQty: 0,
						updatedAt: new Date().toISOString(),
					},
				],
				`dedupe-${now}`,
			);
		});

		const updated = await prisma.workOrder.findUnique({
			where: { woNo },
			select: { routingId: true },
		});
		expect(updated?.routingId).toBe(routingOverride.id);
	});
});
