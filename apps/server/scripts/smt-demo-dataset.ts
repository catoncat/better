import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

if (process.env.DATABASE_URL?.includes("../../")) {
	process.env.DATABASE_URL = "file:./data/db.db";
}

type Db = typeof import("@better-app/db");
type RoutingServiceModule = typeof import("../src/modules/mes/routing/service");

type Options = {
	apiUrl: string;
	adminEmail: string;
	adminPassword: string;
	testPassword: string;
	operatorId: string;
	woNo: string;
	planQty: number;
	unitQty: number;
	sampleQty: number;
	seedOnly: boolean;
};

type SeedResult = {
	lineId: string;
	stationCodes: string[];
	slotIdByCode: Map<string, string>;
};

type DbContext = {
	prisma: Db["default"];
	IntegrationSource: Db["IntegrationSource"];
	SolderPasteStatus: Db["SolderPasteStatus"];
	StationType: Db["StationType"];
	StencilStatus: Db["StencilStatus"];
};

const DEMO = {
	lineCode: "SMT-A",
	lineName: "SMT Line A",
	productCode: "5223029018",
	routeCode: "SMT-BOT-标准路由",
	routeName: "SMT BOT Standard Route",
	defaultWoNo: "WO-20250526-001",
	operatorId: "OP-01",
};

const slotDefs = [
	{ slotCode: "2F-46", slotName: "SMT2-F-46", position: 10 },
	{ slotCode: "2F-34", slotName: "SMT2-F-34", position: 20 },
	{ slotCode: "1R-14", slotName: "SMT1-R-14", position: 30 },
	{ slotCode: "1F-46", slotName: "SMT1-F-46", position: 40 },
];

const materialDefs = [
	{ code: "5212090001", name: "Resistor 10K 0603" },
	{ code: "5212090001B", name: "Resistor 10K 0603 (Alt)" },
	{ code: "5212090007", name: "Capacitor 1uF 0603" },
	{ code: "5212098001", name: "IC Driver QFN" },
	{ code: "5212098004", name: "Connector 6P" },
];

const materialLots = [
	{ materialCode: "5212090001", lotNo: "LOT-20250526-001" },
	{ materialCode: "5212090001B", lotNo: "LOT-20250526-002" },
	{ materialCode: "5212090007", lotNo: "LOT-20250526-003" },
	{ materialCode: "5212098001", lotNo: "LOT-20250526-004" },
	{ materialCode: "5212098004", lotNo: "LOT-20250526-005" },
];

const slotMappings = [
	{
		slotCode: "2F-46",
		materialCode: "5212090001",
		priority: 1,
		isAlternate: false,
	},
	{
		slotCode: "2F-46",
		materialCode: "5212090001B",
		priority: 2,
		isAlternate: true,
	},
	{
		slotCode: "2F-34",
		materialCode: "5212090007",
		priority: 1,
		isAlternate: false,
	},
	{
		slotCode: "1R-14",
		materialCode: "5212098001",
		priority: 1,
		isAlternate: false,
	},
	{
		slotCode: "1F-46",
		materialCode: "5212098004",
		priority: 1,
		isAlternate: false,
	},
];

const stationGroups = [
	{ code: "SMT-A-PRINT", name: "SMT A Printing" },
	{ code: "SMT-A-SPI", name: "SMT A SPI" },
	{ code: "SMT-A-MOUNT", name: "SMT A Mounting" },
	{ code: "SMT-A-REFLOW", name: "SMT A Reflow" },
	{ code: "SMT-A-AOI", name: "SMT A AOI" },
];

const stationDefs = [
	{ code: "SMT-A-PRINT-01", name: "SMT A Printer 01", groupCode: "SMT-A-PRINT" },
	{ code: "SMT-A-SPI-01", name: "SMT A SPI 01", groupCode: "SMT-A-SPI" },
	{ code: "SMT-A-MOUNT-01", name: "SMT A Mount 01", groupCode: "SMT-A-MOUNT" },
	{ code: "SMT-A-REFLOW-01", name: "SMT A Reflow 01", groupCode: "SMT-A-REFLOW" },
	{ code: "SMT-A-AOI-01", name: "SMT A AOI 01", groupCode: "SMT-A-AOI" },
];

const operations = [
	{ code: "PRINTING", name: "Printing" },
	{ code: "SPI", name: "SPI" },
	{ code: "MOUNTING", name: "Mounting" },
	{ code: "REFLOW", name: "Reflow" },
	{ code: "AOI", name: "AOI" },
];

const routingSteps = [
	{ stepNo: 1, opCode: "PRINTING", groupCode: "SMT-A-PRINT", requiresFAI: true },
	{ stepNo: 2, opCode: "SPI", groupCode: "SMT-A-SPI" },
	{ stepNo: 3, opCode: "MOUNTING", groupCode: "SMT-A-MOUNT" },
	{ stepNo: 4, opCode: "REFLOW", groupCode: "SMT-A-REFLOW" },
	{ stepNo: 5, opCode: "AOI", groupCode: "SMT-A-AOI", isLast: true },
];

const parseOptions = (): Options => {
	const args = process.argv.slice(2);
	const getArgValue = (key: string) => {
		const eq = args.find((arg) => arg.startsWith(`${key}=`));
		if (eq) return eq.slice(key.length + 1);
		const idx = args.indexOf(key);
		if (idx >= 0) return args[idx + 1];
		return undefined;
	};

	const toNumber = (value: string | undefined, fallback: number) => {
		if (!value) return fallback;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const planQty = toNumber(getArgValue("--plan-qty"), 10);
	const unitQty = toNumber(getArgValue("--unit-qty"), planQty);
	const sampleQty = Math.min(toNumber(getArgValue("--sample-qty"), 2), unitQty);

	return {
		apiUrl: getArgValue("--api-url") ?? process.env.MES_API_URL ?? "http://127.0.0.1:3000/api",
		adminEmail: getArgValue("--email") ?? process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
		adminPassword: getArgValue("--password") ?? process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
		testPassword: getArgValue("--test-password") ?? process.env.SEED_TEST_PASSWORD ?? "Test123!",
		operatorId: getArgValue("--operator-id") ?? DEMO.operatorId,
		woNo: getArgValue("--wo-no") ?? DEMO.defaultWoNo,
		planQty,
		unitQty,
		sampleQty,
		seedOnly: args.includes("--seed-only"),
	};
};

class ApiClient {
	private cookie = "";

	constructor(private readonly apiUrl: string) {}

	async login(email: string, password: string) {
		const res = await fetch(`${this.apiUrl}/auth/sign-in/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!res.ok) {
			const data = await res.json().catch(() => null);
			throw new Error(`Login failed: ${data?.message ?? res.statusText}`);
		}

		const rawCookie = res.headers.get("set-cookie") || "";
		this.cookie = rawCookie.split(";")[0] || "";
		if (!this.cookie) {
			throw new Error("Login succeeded but session cookie is missing");
		}
	}

	async request(method: string, path: string, body?: unknown) {
		const res = await fetch(`${this.apiUrl}${path}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				"Cookie": this.cookie,
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const data = await res.json().catch(() => null);
		return { res, data };
	}

	async get(path: string) {
		return this.request("GET", path);
	}

	async post(path: string, body?: unknown) {
		return this.request("POST", path, body);
	}

	async put(path: string, body?: unknown) {
		return this.request("PUT", path, body);
	}
}

const expectOk = (res: Response, data: any, label: string) => {
	if (!res.ok || !data?.ok) {
		const message = data?.error?.message ?? res.statusText;
		throw new Error(`${label} failed: ${message}`);
	}
	return data.data;
};

const expectError = (res: Response, data: any, label: string, codes: string[]) => {
	if (res.ok && data?.ok) {
		throw new Error(`${label} expected error but succeeded`);
	}
	const code = data?.error?.code as string | undefined;
	if (!code || !codes.includes(code)) {
		const message = data?.error?.message ?? res.statusText;
		throw new Error(`${label} failed with ${code ?? "unknown"}: ${message}`);
	}
	return data?.error;
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ensureRouteCompiled = async (
	prisma: Db["default"],
	routingService: RoutingServiceModule,
) => {
	const result = await routingService.compileRouteExecution(prisma, DEMO.routeCode);
	if (!result.success) {
		throw new Error(`Route compile failed: ${result.code} ${result.message}`);
	}
	if (result.data.status !== "READY") {
		const errors = Array.isArray(result.data.errorsJson)
			? JSON.stringify(result.data.errorsJson)
			: "Unknown compile errors";
		throw new Error(`Route ${DEMO.routeCode} is not READY: ${errors}`);
	}
};

const ensureLineReadinessEnabled = async (
	prisma: Db["default"],
	lineId: string,
	enabled: string[],
) => {
	const existing = await prisma.line.findUnique({ where: { id: lineId }, select: { meta: true } });
	const baseMeta = isJsonObject(existing?.meta) ? existing?.meta : {};
	const readinessChecks = isJsonObject(baseMeta.readinessChecks) ? baseMeta.readinessChecks : {};

	const nextMeta = {
		...baseMeta,
		readinessChecks: {
			...readinessChecks,
			enabled,
			loadingRequired: true,
		},
	};

	if (JSON.stringify(baseMeta) !== JSON.stringify(nextMeta)) {
		await prisma.line.update({ where: { id: lineId }, data: { meta: nextMeta } });
	}
};

const seedConfig = async (ctx: DbContext): Promise<SeedResult> => {
	const { prisma, IntegrationSource, SolderPasteStatus, StationType, StencilStatus } = ctx;
	const line = await prisma.line.upsert({
		where: { code: DEMO.lineCode },
		update: { name: DEMO.lineName },
		create: { code: DEMO.lineCode, name: DEMO.lineName },
	});

	await ensureLineReadinessEnabled(prisma, line.id, [
		"ROUTE",
		"LOADING",
		"EQUIPMENT",
		"MATERIAL",
		"STENCIL",
		"SOLDER_PASTE",
	]);

	const groupByCode = new Map<string, string>();
	for (const group of stationGroups) {
		const created = await prisma.stationGroup.upsert({
			where: { code: group.code },
			update: { name: group.name },
			create: { code: group.code, name: group.name },
		});
		groupByCode.set(group.code, created.id);
	}

	for (const station of stationDefs) {
		const groupId = groupByCode.get(station.groupCode);
		if (!groupId) {
			throw new Error(`Missing station group for ${station.groupCode}`);
		}
		await prisma.station.upsert({
			where: { code: station.code },
			update: {
				name: station.name,
				stationType: StationType.MANUAL,
				lineId: line.id,
				groupId,
			},
			create: {
				code: station.code,
				name: station.name,
				stationType: StationType.MANUAL,
				lineId: line.id,
				groupId,
			},
		});

		await prisma.tpmEquipment.upsert({
			where: { equipmentCode: station.code },
			update: { name: station.name, status: "normal" },
			create: { equipmentCode: station.code, name: station.name, status: "normal" },
		});
	}

	const opByCode = new Map<string, string>();
	for (const op of operations) {
		const created = await prisma.operation.upsert({
			where: { code: op.code },
			update: { name: op.name, defaultType: StationType.MANUAL },
			create: { code: op.code, name: op.name, defaultType: StationType.MANUAL },
		});
		opByCode.set(op.code, created.id);
	}

	const routing = await prisma.routing.upsert({
		where: { code: DEMO.routeCode },
		update: { name: DEMO.routeName, productCode: DEMO.productCode },
		create: {
			code: DEMO.routeCode,
			name: DEMO.routeName,
			productCode: DEMO.productCode,
		},
	});

	for (const step of routingSteps) {
		const operationId = opByCode.get(step.opCode);
		const stationGroupId = groupByCode.get(step.groupCode);
		if (!operationId || !stationGroupId) {
			throw new Error(`Missing routing refs for step ${step.stepNo}`);
		}
		await prisma.routingStep.upsert({
			where: { routingId_stepNo: { routingId: routing.id, stepNo: step.stepNo } },
			update: {
				operationId,
				stationGroupId,
				stationType: StationType.MANUAL,
				requiresFAI: Boolean(step.requiresFAI),
				isLast: Boolean(step.isLast),
			},
			create: {
				routingId: routing.id,
				stepNo: step.stepNo,
				operationId,
				stationGroupId,
				stationType: StationType.MANUAL,
				requiresFAI: Boolean(step.requiresFAI),
				isLast: Boolean(step.isLast),
			},
		});
	}

	const slotIdByCode = new Map<string, string>();
	for (const slot of slotDefs) {
		const created = await prisma.feederSlot.upsert({
			where: { lineId_slotCode: { lineId: line.id, slotCode: slot.slotCode } },
			update: { slotName: slot.slotName, position: slot.position },
			create: {
				lineId: line.id,
				slotCode: slot.slotCode,
				slotName: slot.slotName,
				position: slot.position,
			},
		});
		slotIdByCode.set(slot.slotCode, created.id);
	}

	for (const material of materialDefs) {
		await prisma.material.upsert({
			where: { code: material.code },
			update: { name: material.name },
			create: { code: material.code, name: material.name },
		});
	}

	for (const lot of materialLots) {
		await prisma.materialLot.upsert({
			where: { materialCode_lotNo: { materialCode: lot.materialCode, lotNo: lot.lotNo } },
			update: {},
			create: { materialCode: lot.materialCode, lotNo: lot.lotNo },
		});
	}

	for (const material of materialDefs) {
		await prisma.bomItem.upsert({
			where: {
				parentCode_childCode: { parentCode: DEMO.productCode, childCode: material.code },
			},
			update: { qty: 1 },
			create: { parentCode: DEMO.productCode, childCode: material.code, qty: 1 },
		});
	}

	for (const mapping of slotMappings) {
		const slotId = slotIdByCode.get(mapping.slotCode);
		if (!slotId) {
			throw new Error(`Missing slot for mapping ${mapping.slotCode}`);
		}
		await prisma.slotMaterialMapping.upsert({
			where: { slotId_materialCode: { slotId, materialCode: mapping.materialCode } },
			update: {
				productCode: DEMO.productCode,
				routingId: routing.id,
				priority: mapping.priority,
				isAlternate: mapping.isAlternate,
			},
			create: {
				slotId,
				materialCode: mapping.materialCode,
				productCode: DEMO.productCode,
				routingId: routing.id,
				priority: mapping.priority,
				isAlternate: mapping.isAlternate,
			},
		});
	}

	const stencilId = "STENCIL-SMT-A-01";
	const lineStencil = await prisma.lineStencil.findFirst({
		where: { lineId: line.id, stencilId, isCurrent: true },
	});
	if (!lineStencil) {
		await prisma.lineStencil.create({
			data: { lineId: line.id, stencilId, isCurrent: true, boundBy: "SYSTEM" },
		});
	}

	await prisma.stencilStatusRecord.upsert({
		where: { eventId: "DEMO-SMT-A-STENCIL-READY" },
		update: {
			eventTime: new Date(),
			status: StencilStatus.READY,
			source: IntegrationSource.AUTO,
		},
		create: {
			eventId: "DEMO-SMT-A-STENCIL-READY",
			eventTime: new Date(),
			stencilId,
			status: StencilStatus.READY,
			source: IntegrationSource.AUTO,
		},
	});

	const solderLotId = "SP-LOT-20250526-001";
	const linePaste = await prisma.lineSolderPaste.findFirst({
		where: { lineId: line.id, lotId: solderLotId, isCurrent: true },
	});
	if (!linePaste) {
		await prisma.lineSolderPaste.create({
			data: { lineId: line.id, lotId: solderLotId, isCurrent: true, boundBy: "SYSTEM" },
		});
	}

	await prisma.solderPasteStatusRecord.upsert({
		where: { eventId: "DEMO-SMT-A-PASTE-COMPLIANT" },
		update: {
			eventTime: new Date(),
			status: SolderPasteStatus.COMPLIANT,
			source: IntegrationSource.AUTO,
		},
		create: {
			eventId: "DEMO-SMT-A-PASTE-COMPLIANT",
			eventTime: new Date(),
			lotId: solderLotId,
			status: SolderPasteStatus.COMPLIANT,
			source: IntegrationSource.AUTO,
		},
	});

	return {
		lineId: line.id,
		stationCodes: stationDefs.map((station) => station.code),
		slotIdByCode,
	};
};

const runDemoFlow = async (options: Options, seed: SeedResult) => {
	const planner = new ApiClient(options.apiUrl);
	const engineer = new ApiClient(options.apiUrl);
	const material = new ApiClient(options.apiUrl);
	const operator = new ApiClient(options.apiUrl);
	const quality = new ApiClient(options.apiUrl);

	await planner.login("planner@example.com", options.testPassword);
	await engineer.login("engineer@example.com", options.testPassword);
	await material.login("material@example.com", options.testPassword);
	await operator.login("operator@example.com", options.testPassword);
	await quality.login("quality@example.com", options.testPassword);

	const woRes = await planner.post("/integration/work-orders", {
		woNo: options.woNo,
		productCode: DEMO.productCode,
		plannedQty: options.planQty,
		routingCode: DEMO.routeCode,
		pickStatus: "2",
	});
	expectOk(woRes.res, woRes.data, "Work order receive");

	const releaseRes = await planner.post(`/work-orders/${options.woNo}/release`, {
		lineCode: DEMO.lineCode,
	});
	expectOk(releaseRes.res, releaseRes.data, "Work order release");

	const runRes = await planner.post(`/work-orders/${options.woNo}/runs`, {
		lineCode: DEMO.lineCode,
		planQty: options.planQty,
	});
	const run = expectOk(runRes.res, runRes.data, "Run create");
	const runNo = run.runNo as string;

	const unitsRes = await planner.post(`/runs/${runNo}/generate-units`, {
		quantity: options.unitQty,
		snPrefix: `SN-${runNo}-`,
	});
	const unitData = expectOk(unitsRes.res, unitsRes.data, "Generate units");
	const unitSns = Array.isArray(unitData.units) ? unitData.units.map((u: any) => u.sn) : [];

	const samplingRuleRes = await quality.post("/oqc/sampling-rules", {
		productCode: DEMO.productCode,
		samplingType: "PERCENTAGE",
		sampleValue: 10,
		priority: 100,
		isActive: true,
	});
	expectOk(samplingRuleRes.res, samplingRuleRes.data, "OQC sampling rule create");

	const loadTable = await material.post(`/runs/${runNo}/loading/load-table`);
	expectOk(loadTable.res, loadTable.data, "Load slot table");

	const passRes = await material.post("/loading/verify", {
		runNo,
		slotCode: "2F-34",
		materialLotBarcode: "5212090007|LOT-20250526-003",
		operatorId: options.operatorId,
	});
	const passRecord = expectOk(passRes.res, passRes.data, "Loading PASS");
	if (passRecord.verifyResult !== "PASS") {
		throw new Error(`Loading PASS returned ${passRecord.verifyResult}`);
	}

	const warnRes = await material.post("/loading/verify", {
		runNo,
		slotCode: "2F-46",
		materialLotBarcode: "5212090001B|LOT-20250526-002",
		operatorId: options.operatorId,
		packageQty: 2000,
	});
	const warnRecord = expectOk(warnRes.res, warnRes.data, "Loading WARNING");
	if (warnRecord.verifyResult !== "WARNING") {
		throw new Error(`Loading WARNING returned ${warnRecord.verifyResult}`);
	}

	for (let attempt = 1; attempt <= 3; attempt++) {
		const failRes = await material.post("/loading/verify", {
			runNo,
			slotCode: "1R-14",
			materialLotBarcode: "9999999999|LOT-FAIL-001",
			operatorId: options.operatorId,
		});
		if (failRes.res.ok && failRes.data?.ok) {
			const record = failRes.data.data;
			if (record.verifyResult !== "FAIL") {
				throw new Error(`Loading FAIL attempt ${attempt} returned ${record.verifyResult}`);
			}
		} else {
			expectError(failRes.res, failRes.data, `Loading FAIL attempt ${attempt}`, [
				"MATERIAL_LOT_NOT_FOUND",
				"SLOT_LOCKED",
			]);
		}
	}

	const lockSlotId = seed.slotIdByCode.get("1R-14");
	if (!lockSlotId) {
		throw new Error("Missing slotId for 1R-14");
	}
	const unlockRes = await engineer.post(`/feeder-slots/${lockSlotId}/unlock`, {
		reason: "Demo unlock after wrong scan",
	});
	expectOk(unlockRes.res, unlockRes.data, "Unlock slot 1R-14");

	const retryRes = await material.post("/loading/verify", {
		runNo,
		slotCode: "1R-14",
		materialLotBarcode: "5212098001|LOT-20250526-004",
		operatorId: options.operatorId,
	});
	const retryRecord = expectOk(retryRes.res, retryRes.data, "Loading PASS after unlock");
	if (retryRecord.verifyResult !== "PASS") {
		throw new Error(`Loading PASS after unlock returned ${retryRecord.verifyResult}`);
	}

	const lastSlotRes = await material.post("/loading/verify", {
		runNo,
		slotCode: "1F-46",
		materialLotBarcode: "5212098004|LOT-20250526-005",
		operatorId: options.operatorId,
	});
	const lastRecord = expectOk(lastSlotRes.res, lastSlotRes.data, "Loading PASS 1F-46");
	if (lastRecord.verifyResult !== "PASS") {
		throw new Error(`Loading PASS 1F-46 returned ${lastRecord.verifyResult}`);
	}

	const replaceRes = await material.post("/loading/replace", {
		runNo,
		slotCode: "2F-46",
		newMaterialLotBarcode: "5212090001|LOT-20250526-001",
		operatorId: options.operatorId,
		reason: "Demo replace to primary",
		packageQty: 1800,
	});
	expectOk(replaceRes.res, replaceRes.data, "Loading replace");

	const readinessRes = await quality.post(`/runs/${runNo}/readiness/check`);
	const readiness = expectOk(readinessRes.res, readinessRes.data, "Readiness check");
	if (readiness.status !== "PASSED") {
		throw new Error(`Readiness check failed with status ${readiness.status}`);
	}

	const faiRes = await quality.post(`/fai/run/${runNo}`, { sampleQty: options.sampleQty });
	const fai = expectOk(faiRes.res, faiRes.data, "FAI create");
	const faiId = fai.id as string;

	const faiStart = await quality.post(`/fai/${faiId}/start`);
	expectOk(faiStart.res, faiStart.data, "FAI start");

	const sampleUnits = unitSns.slice(0, options.sampleQty);
	const firstStation = seed.stationCodes[0];
	if (!firstStation) {
		throw new Error("Missing station codes for FAI");
	}

	for (const sn of sampleUnits) {
		const trackIn = await operator.post(`/stations/${firstStation}/track-in`, {
			sn,
			woNo: options.woNo,
			runNo,
		});
		expectOk(trackIn.res, trackIn.data, `FAI track-in ${sn}`);

		const trackOut = await operator.post(`/stations/${firstStation}/track-out`, {
			sn,
			runNo,
			result: "PASS",
			operatorId: options.operatorId,
		});
		expectOk(trackOut.res, trackOut.data, `FAI track-out ${sn}`);
	}

	const faiItemA = await quality.post(`/fai/${faiId}/items`, {
		itemName: "Solder Paste Thickness",
		result: "PASS",
	});
	expectOk(faiItemA.res, faiItemA.data, "FAI record item A");

	const faiItemB = await quality.post(`/fai/${faiId}/items`, {
		itemName: "Placement Quality",
		result: "PASS",
	});
	expectOk(faiItemB.res, faiItemB.data, "FAI record item B");

	const faiComplete = await quality.post(`/fai/${faiId}/complete`, { decision: "PASS" });
	expectOk(faiComplete.res, faiComplete.data, "FAI complete");

	const faiSign = await quality.post(`/fai/${faiId}/sign`, { remark: "Auto sign" });
	expectOk(faiSign.res, faiSign.data, "FAI sign");

	const authorize = await planner.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
	expectOk(authorize.res, authorize.data, "Run authorize");

	const sampleSet = new Set(sampleUnits);
	for (const sn of unitSns) {
		for (const station of seed.stationCodes) {
			if (sampleSet.has(sn) && station === firstStation) {
				continue;
			}
			const trackIn = await operator.post(`/stations/${station}/track-in`, {
				sn,
				woNo: options.woNo,
				runNo,
			});
			expectOk(trackIn.res, trackIn.data, `Track-in ${sn} ${station}`);

			const trackOut = await operator.post(`/stations/${station}/track-out`, {
				sn,
				runNo,
				result: "PASS",
				operatorId: options.operatorId,
			});
			expectOk(trackOut.res, trackOut.data, `Track-out ${sn} ${station}`);
		}
	}

	const closeAttempt = await planner.post(`/runs/${runNo}/close`);
	if (closeAttempt.res.ok && closeAttempt.data?.ok) {
		return { runNo, unitSns, faiId, oqcId: null as string | null };
	}

	const closeCode = closeAttempt.data?.error?.code as string | undefined;
	if (closeCode !== "OQC_REQUIRED") {
		throw new Error(`Run closeout failed: ${closeAttempt.data?.error?.message ?? closeAttempt.res.statusText}`);
	}

	const oqcRes = await quality.get(`/oqc/run/${runNo}`);
	const oqc = expectOk(oqcRes.res, oqcRes.data, "Get OQC by run");
	const oqcId = oqc.id as string;

	const oqcStart = await quality.post(`/oqc/${oqcId}/start`);
	expectOk(oqcStart.res, oqcStart.data, "OQC start");

	const oqcItem = await quality.post(`/oqc/${oqcId}/items`, {
		unitSn: unitSns[0],
		itemName: "OQC Visual",
		result: "PASS",
	});
	expectOk(oqcItem.res, oqcItem.data, "OQC record item");

	const oqcComplete = await quality.post(`/oqc/${oqcId}/complete`, { decision: "PASS" });
	expectOk(oqcComplete.res, oqcComplete.data, "OQC complete");

	const closeFinal = await planner.post(`/runs/${runNo}/close`);
	expectOk(closeFinal.res, closeFinal.data, "Run closeout (final)");

	return { runNo, unitSns, faiId, oqcId };
};

const main = async () => {
	const options = parseOptions();
	console.log(`[smt-demo] Seeding SMT demo data (${DEMO.lineCode}, ${DEMO.routeCode})...`);

	const db = (await import("@better-app/db")) as Db;
	const routingService = (await import("../src/modules/mes/routing/service")) as RoutingServiceModule;
	const ctx: DbContext = {
		prisma: db.default,
		IntegrationSource: db.IntegrationSource,
		SolderPasteStatus: db.SolderPasteStatus,
		StationType: db.StationType,
		StencilStatus: db.StencilStatus,
	};

	try {
		const seed = await seedConfig(ctx);
		await ensureRouteCompiled(ctx.prisma, routingService);
		console.log("[smt-demo] Base config ready.");

		if (options.seedOnly) {
			console.log("[smt-demo] --seed-only set, skipping run flow.");
			return;
		}

		const summary = await runDemoFlow(options, seed);
		console.log("[smt-demo] Demo run completed.");
		console.log(`[smt-demo] Run: ${summary.runNo}`);
		console.log(
			`[smt-demo] Units: ${summary.unitSns.slice(0, 3).join(", ")}${summary.unitSns.length > 3 ? "..." : ""}`,
		);
		console.log(`[smt-demo] FAI: ${summary.faiId}`);
		console.log(`[smt-demo] OQC: ${summary.oqcId ?? "not required"}`);
	} finally {
		await ctx.prisma.$disconnect();
	}
};

main().catch((error) => {
	console.error("[smt-demo] Failed:", error);
	process.exitCode = 1;
});
