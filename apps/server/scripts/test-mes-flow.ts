import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

type Scenario = "happy" | "oqc-fail-mrb-release" | "oqc-fail-mrb-scrap" | "readiness-waive";

type Track = "smt" | "dip";
type IdStrategy = "unique" | "reuse-wo";

type CliOptions = {
	apiUrl: string;
	adminEmail: string;
	adminPassword: string;
	testPassword: string;
	track: Track;
	idStrategy: IdStrategy;
	dataset: string;
	withLoading: boolean;
	lineCode: string;
	routeCode: string;
	productCode: string;
	slotCode: string;
	materialCode: string;
	operatorId: string;
	woNo?: string;
	sn?: string;
	json: boolean;
	jsonFile?: string;
	scenario: Scenario;
};

type StepResult = {
	name: string;
	ok: boolean;
	startedAt: string;
	endedAt: string;
	durationMs: number;
	error?: { code?: string; message: string; status?: number };
	meta?: Record<string, unknown>;
};

type FlowSummary = {
	ok: boolean;
	startedAt: string;
	endedAt?: string;
	durationMs?: number;
	context: {
		apiUrl: string;
		track?: Track;
		idStrategy?: IdStrategy;
		dataset?: string;
		withLoading?: boolean;
		lineCode: string;
		routeCode: string;
		productCode: string;
		scenario?: Scenario;
		woNo?: string;
		runNo?: string;
		sn?: string;
		oqcSamplingRuleId?: string;
		oqcId?: string;
		faiId?: string;
		mrbDecision?: string;
		reworkRunNo?: string;
	};
	steps: StepResult[];
	error?: { message: string };
};

class ApiError extends Error {
	public readonly code?: string;
	public readonly status?: number;

	constructor(message: string, options?: { code?: string; status?: number }) {
		super(message);
		this.code = options?.code;
		this.status = options?.status;
	}
}

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
			throw new ApiError(`Login failed: ${data?.message ?? res.statusText}`, {
				status: res.status,
			});
		}

		const rawCookie = res.headers.get("set-cookie") || "";
		this.cookie = rawCookie.split(";")[0] || "";
		if (!this.cookie) {
			throw new ApiError("Login succeeded but session cookie is missing");
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

const parseCliOptions = (): CliOptions => {
	const apiUrl = process.env.MES_API_URL || "http://127.0.0.1:3000/api";
	const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
	const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
	const testPassword = process.env.SEED_TEST_PASSWORD || "Test123!";

	const args = process.argv.slice(2);
	const getArgValue = (key: string) => {
		const eq = args.find((a) => a.startsWith(`${key}=`));
		if (eq) return eq.slice(key.length + 1);
		const idx = args.indexOf(key);
		if (idx >= 0) return args[idx + 1];
		return undefined;
	};

	if (args.includes("--help") || args.includes("-h")) {
		console.log(
			[
				"Usage: bun apps/server/scripts/test-mes-flow.ts [options]",
				"",
				"Options:",
				"  --api-url <url>        API base url (default: http://127.0.0.1:3000/api)",
				"  --email <email>        Admin email (default: SEED_ADMIN_EMAIL)",
				"  --password <pwd>       Admin password (default: SEED_ADMIN_PASSWORD)",
				"  --test-password <pwd>  Password for seeded test users (default: Test123!)",
				"  --track <smt|dip>      Process track (default: smt)",
				"  --line-code <code>     Override line code (default by track)",
				"  --route-code <code>    Override route code (default by track)",
				"  --product-code <code>  Product code (default: P-1001)",
				"  --slot-code <code>     Slot code for Loading verify (default: SLOT-01)",
				"  --material-code <code> Material code for Loading verify (default: MAT-001)",
				"  --operator-id <id>     Operator id for track-out/loading (default: OP-01)",
				"  --with-loading         Force run loading verification steps",
				"  --skip-loading         Skip loading verification steps",
				"  --id-strategy <mode>   Repeatability strategy (default: reuse-wo)",
				"                         - unique: unique WO/SN per run (data isolated, grows DB)",
				"                         - reuse-wo: stable WO per (dataset,track,scenario); each run creates a new Run+SN",
				"  --dataset <key>        Dataset key used in WO/SN (default: acceptance)",
				"  --wo-no <woNo>         Override WO number (advanced)",
				"  --sn <sn>              Override SN (advanced; must be globally unique)",
				"  --scenario <name>      Scenario to run (default: happy)",
				"                         - happy: OQC PASS → Run COMPLETED",
				"                         - oqc-fail-mrb-release: OQC FAIL → MRB RELEASE → Run COMPLETED",
				"                         - oqc-fail-mrb-scrap: OQC FAIL → MRB SCRAP → Run SCRAPPED",
				"                         - readiness-waive: Readiness FAIL (Loading + External gates) → Waive → Authorize PASS",
				"  --json                 Print JSON summary to stdout",
				"  --json-file <path>     Write JSON summary to file",
			].join("\n"),
		);
		process.exit(0);
	}

	const scenarioArg = getArgValue("--scenario") ?? "happy";
	const validScenarios: Scenario[] = ["happy", "oqc-fail-mrb-release", "oqc-fail-mrb-scrap", "readiness-waive"];
	if (!validScenarios.includes(scenarioArg as Scenario)) {
		console.error(`Invalid scenario: ${scenarioArg}. Valid: ${validScenarios.join(", ")}`);
		process.exit(1);
	}

	const trackArg = (getArgValue("--track") ?? "smt").toLowerCase();
	const track: Track = trackArg === "dip" ? "dip" : "smt";

	const idStrategyArg = (getArgValue("--id-strategy") ?? "reuse-wo").toLowerCase();
	const idStrategy: IdStrategy = idStrategyArg === "unique" ? "unique" : "reuse-wo";

	const datasetRaw = getArgValue("--dataset") ?? "acceptance";
	const dataset = datasetRaw.trim() || "acceptance";

	const defaultLineCode = track === "dip" ? "LINE-DIP-A" : "LINE-A";
	const defaultRouteCode = track === "dip" ? "PCBA-DIP-V1" : "PCBA-STD-V1";

	const withLoadingFlag = args.includes("--with-loading");
	const skipLoadingFlag = args.includes("--skip-loading");
	const withLoading = withLoadingFlag ? true : skipLoadingFlag ? false : track !== "dip";

	if (scenarioArg === "readiness-waive" && !withLoading) {
		console.error("Scenario readiness-waive requires loading enabled (remove --skip-loading).");
		process.exit(1);
	}
	if (scenarioArg === "readiness-waive" && track === "dip") {
		console.error("Scenario readiness-waive is only supported on SMT track (track=smt).");
		process.exit(1);
	}

	return {
		apiUrl: getArgValue("--api-url") ?? apiUrl,
		adminEmail: getArgValue("--email") ?? adminEmail,
		adminPassword: getArgValue("--password") ?? adminPassword,
		testPassword: getArgValue("--test-password") ?? testPassword,
		track,
		idStrategy,
		dataset,
		withLoading,
		lineCode: getArgValue("--line-code") ?? defaultLineCode,
		routeCode: getArgValue("--route-code") ?? defaultRouteCode,
		productCode: getArgValue("--product-code") ?? "P-1001",
		slotCode: getArgValue("--slot-code") ?? "SLOT-01",
		materialCode: getArgValue("--material-code") ?? "MAT-001",
		operatorId: getArgValue("--operator-id") ?? "OP-01",
		woNo: getArgValue("--wo-no"),
		sn: getArgValue("--sn"),
		json: args.includes("--json"),
		jsonFile: getArgValue("--json-file"),
		scenario: scenarioArg as Scenario,
	};
};

const isoNow = () => new Date().toISOString();

const runStep = async <T>(summary: FlowSummary, name: string, fn: () => Promise<T>, meta?: StepResult["meta"]) => {
	const startedAtMs = Date.now();
	const startedAt = isoNow();
	try {
		const data = await fn();
		const endedAt = isoNow();
		summary.steps.push({
			name,
			ok: true,
			startedAt,
			endedAt,
			durationMs: Date.now() - startedAtMs,
			meta,
		});
		return data;
	} catch (error) {
		const endedAt = isoNow();
		const apiError = error instanceof ApiError ? error : null;
		summary.steps.push({
			name,
			ok: false,
			startedAt,
			endedAt,
			durationMs: Date.now() - startedAtMs,
			error: {
				code: apiError?.code,
				message: apiError?.message ?? (error instanceof Error ? error.message : String(error)),
				status: apiError?.status,
			},
			meta,
		});
		throw error;
	}
};

const expectOk = (res: Response, data: any, action: string) => {
	if (res.ok && data?.ok) return data.data;
	throw new ApiError(`${action} failed: ${data?.error?.message ?? res.statusText}`, {
		code: data?.error?.code,
		status: res.status,
	});
};

async function runTest(options: CliOptions) {
	const summary: FlowSummary = {
		ok: false,
		startedAt: isoNow(),
		context: {
			apiUrl: options.apiUrl,
			track: options.track,
			idStrategy: options.idStrategy,
			dataset: options.dataset,
			withLoading: options.withLoading,
			lineCode: options.lineCode,
			routeCode: options.routeCode,
			productCode: options.productCode,
			scenario: options.scenario,
		},
		steps: [],
	};

	const admin = new ApiClient(options.apiUrl);
	const engineer = new ApiClient(options.apiUrl);
	const planner = new ApiClient(options.apiUrl);
	const material = new ApiClient(options.apiUrl);
	const operator = new ApiClient(options.apiUrl);
	const quality = new ApiClient(options.apiUrl);

	const engineerEmail = "engineer@example.com";
	const plannerEmail = "planner@example.com";
	const materialEmail = "material@example.com";
	const operatorEmail = "operator@example.com";
	const qualityEmail = "quality@example.com";
	const now = Date.now();
	const key = `${options.dataset}-${options.track}-${options.scenario}`;
	const woNo =
		options.woNo ??
		(options.idStrategy === "reuse-wo" ? `WO-${key}` : `WO-${key}-${now}`);
	const sn = options.sn ?? `SN-${key}-${now}`;
	let samplingRuleId: string | undefined;

	summary.context.woNo = woNo;
	summary.context.sn = sn;

	let restoreReadinessConfig: null | { lineId: string; enabled: string[] } = null;

	try {
		await runStep(
			summary,
			"Auth: login admin",
			() => admin.login(options.adminEmail, options.adminPassword),
			{ actor: "admin" },
		);
		await runStep(
			summary,
			"Auth: login engineer",
			() => engineer.login(engineerEmail, options.testPassword),
			{ actor: "engineer" },
		);
		await runStep(
			summary,
			"Auth: login planner",
			() => planner.login(plannerEmail, options.testPassword),
			{ actor: "planner" },
		);
		await runStep(
			summary,
			"Auth: login material",
			() => material.login(materialEmail, options.testPassword),
			{ actor: "material" },
		);
		await runStep(
			summary,
			"Auth: login operator",
			() => operator.login(operatorEmail, options.testPassword),
			{ actor: "operator" },
		);
		await runStep(
			summary,
			"Auth: login quality",
			() => quality.login(qualityEmail, options.testPassword),
			{ actor: "quality" },
		);

		await runStep(summary, "Routing: compile route", async () => {
			const { res, data } = await engineer.post(`/routes/${options.routeCode}/compile`);
			const compiled = expectOk(res, data, "Route compile");
			if (compiled.status !== "READY") {
				throw new ApiError(`Route compile status is ${compiled.status}, expected READY`);
			}
			return compiled;
		}, { actor: "engineer" });

		await runStep(summary, "WO: receive", async () => {
			const { res, data } = await admin.post("/integration/work-orders", {
				woNo,
				productCode: options.productCode,
				plannedQty: 100,
				routingCode: options.routeCode,
				pickStatus: "2",
			});
			return expectOk(res, data, "WO receive");
		}, { actor: "admin" });

		await runStep(summary, "WO: release", async () => {
			const { res, data } = await planner.post(`/work-orders/${woNo}/release`, {
				lineCode: options.lineCode,
			});
			if (res.ok && data?.ok) return data.data;
			const code = data?.error?.code as string | undefined;
			if (options.idStrategy === "reuse-wo" && code === "WORK_ORDER_NOT_RECEIVED") {
				return { skipped: true, reason: "work order already released or in progress" };
			}
			throw new ApiError(`WO release failed: ${data?.error?.message ?? res.statusText}`, {
				code,
				status: res.status,
			});
		}, { actor: "planner" });

		const runNo = await runStep(summary, "Run: create", async () => {
			const { res, data } = await planner.post(`/work-orders/${woNo}/runs`, { lineCode: options.lineCode });
			const created = expectOk(res, data, "Run create");
			if (!created.runNo) {
				throw new ApiError("Run create response missing runNo");
			}
			return created.runNo as string;
		}, { actor: "planner" });

		summary.context.runNo = runNo;

		samplingRuleId = await runStep(
			summary,
			"OQC: create sampling rule (force FIXED=1)",
			async () => {
				const { res, data } = await quality.post("/oqc/sampling-rules", {
					productCode: options.productCode,
					samplingType: "FIXED",
					sampleValue: 1,
					priority: 100,
					isActive: true,
				});
				const created = expectOk(res, data, "Create OQC sampling rule");
				if (!created.id) {
					throw new ApiError("Create OQC sampling rule response missing id");
				}
				return created.id as string;
			},
			{ actor: "quality" },
		);
		summary.context.oqcSamplingRuleId = samplingRuleId;

		if (options.withLoading) {
			await runStep(summary, "Loading: load slot expectations", async () => {
				const { res, data } = await material.post(`/runs/${runNo}/loading/load-table`);
				return expectOk(res, data, "Load slot table");
			}, { actor: "material" });
		} else {
			await runStep(summary, "Loading: skipped (withLoading=false)", async () => {
				return { skipped: true };
			}, { actor: "material" });
		}

		if (options.scenario === "readiness-waive") {
			const enabledReadiness = ["ROUTE", "LOADING", "EQUIPMENT", "STENCIL", "SOLDER_PASTE"];

			const lineId = await runStep(summary, "Line: resolve lineId", async () => {
				const { res, data } = await engineer.get("/lines");
				const list = expectOk(res, data, "List lines");
				const items = Array.isArray(list.items) ? list.items : [];
				const line = items.find((item: any) => item?.code === options.lineCode);
				if (!line?.id) {
					throw new ApiError(`Line not found for code=${options.lineCode}`);
				}
				return line.id as string;
			}, { actor: "engineer" });

			restoreReadinessConfig = await runStep(summary, "Line: capture readiness config", async () => {
				const { res, data } = await engineer.get(`/lines/${lineId}/readiness-config`);
				const config = expectOk(res, data, "Get readiness config");
				const enabled = Array.isArray(config.enabled)
					? config.enabled.filter((v: any) => typeof v === "string")
					: [];
				return { lineId, enabled };
			}, { actor: "engineer" });

			await runStep(summary, "Line: set readiness config (enable external gates)", async () => {
				const { res, data } = await engineer.put(`/lines/${lineId}/readiness-config`, {
					enabled: enabledReadiness,
				});
				const updated = expectOk(res, data, "Update readiness config");
				const enabled = Array.isArray(updated.enabled)
					? updated.enabled.filter((v: any) => typeof v === "string")
					: [];
				for (const expected of enabledReadiness) {
					if (!enabled.includes(expected)) {
						throw new ApiError(`Readiness config missing enabled item: ${expected}`);
					}
				}
				return updated;
			}, { actor: "engineer" });

			// Intentionally SKIP verify to cause Loading check failure (PENDING)
			const check = await runStep(summary, "Readiness: formal check (expect FAIL)", async () => {
				const { res, data } = await quality.post(`/runs/${runNo}/readiness/check`);
				// Note: check API returns 200 even on FAIL, but data.status should be FAILED
				const result = expectOk(res, data, "Readiness formal check");
				if (result.status !== "FAILED") {
					throw new ApiError(`Readiness status is ${result.status}, expected FAILED`);
				}
				return result;
			}, { actor: "quality" });

			const targetTypes = new Set(["LOADING", "EQUIPMENT", "STENCIL", "SOLDER_PASTE"]);
			const failedItems = Array.isArray(check.items)
				? check.items.filter((i: any) => targetTypes.has(i?.itemType) && i?.status === "FAILED")
				: [];

			const seenTypes = new Set(failedItems.map((i: any) => i.itemType));
			for (const expected of ["LOADING", "EQUIPMENT", "STENCIL", "SOLDER_PASTE"]) {
				if (!seenTypes.has(expected)) {
					throw new ApiError(`Readiness FAIL but missing failed ${expected} item`);
				}
			}

			await runStep(summary, "Readiness: waive failed items", async () => {
				const results: unknown[] = [];
				for (const item of failedItems) {
					const { res, data } = await quality.post(`/runs/${runNo}/readiness/items/${item.id}/waive`, {
						reason: `Acceptance test waive: ${item.itemType}`,
					});
					results.push(expectOk(res, data, `Waive item ${item.itemType}`));
				}
				return { waived: results.length };
			}, { actor: "quality" });

			await runStep(summary, "Readiness: verify waived status (expect PASS)", async () => {
				// Use GET /latest instead of POST /check to verify the WAIVER persists on the current check
				const { res, data } = await quality.get(`/runs/${runNo}/readiness/latest?type=FORMAL`);
				const result = expectOk(res, data, "Readiness latest check");
				
				if (result.status !== "PASSED") {
					throw new ApiError(`Readiness status is ${result.status}, expected PASSED after waive`);
				}

				const waived = Array.isArray(result.items)
					? result.items.filter((i: any) => targetTypes.has(i?.itemType) && i?.status === "WAIVED")
					: [];

				const waivedTypes = new Set(waived.map((i: any) => i.itemType));
				for (const expected of ["LOADING", "EQUIPMENT", "STENCIL", "SOLDER_PASTE"]) {
					if (!waivedTypes.has(expected)) {
						throw new ApiError(`Readiness PASSED but missing waived ${expected} item`);
					}
				}

				for (const item of waived) {
					if (!item.waivedBy) {
						throw new ApiError(`Item waivedBy is missing for ${item.itemType} (attribution check failed)`);
					}
					if (!item.waiveReason) {
						throw new ApiError(`Item waiveReason is missing for ${item.itemType}`);
					}
				}

				return result;
			}, { actor: "quality" });

			await runStep(summary, "Run: authorize (expect FAI error, confirming Readiness passed)", async () => {
				const { res, data } = await planner.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
				// We expect FAI_NOT_PASSED. If it was READINESS_CHECK_FAILED, then our waive didn't work.
				if (res.ok && data?.ok) {
					throw new ApiError("Authorize unexpectedly succeeded (expected FAI_NOT_PASSED)");
				}
				const code = data?.error?.code;
				if (code !== "FAI_NOT_PASSED") {
					throw new ApiError(`Authorize failed with ${code}, expected FAI_NOT_PASSED (which implies Readiness passed)`);
				}
				return data?.error;
			}, { actor: "planner" });

			// Complete FAI to proceed to Trace check
			await runStep(summary, "FAI: complete (PASS)", async () => {
				const created = await quality.post(`/fai/run/${runNo}`, { sampleQty: 1 });
				const fai = expectOk(created.res, created.data, "FAI create");
				
				const started = await quality.post(`/fai/${fai.id}/start`);
				expectOk(started.res, started.data, "FAI start");

				const item = await quality.post(`/fai/${fai.id}/items`, { itemName: "Visual", result: "PASS" });
				expectOk(item.res, item.data, "FAI record item");

				const completed = await quality.post(`/fai/${fai.id}/complete`, { decision: "PASS" });
				return expectOk(completed.res, completed.data, "FAI complete");
			}, { actor: "quality" });

			await runStep(summary, "Run: authorize (expect PASS)", async () => {
				const { res, data } = await planner.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
				return expectOk(res, data, "Run authorize");
			}, { actor: "planner" });

			// Track in to create unit
			const unitSn = `SN-WAIVE-${Date.now()}`;
			await runStep(summary, "Execution: track-in (create unit)", async () => {
				const { res, data } = await operator.post(`/stations/ST-PRINT-01/track-in`, { sn: unitSn, woNo, runNo });
				return expectOk(res, data, "Track-in");
			}, { actor: "operator" });

			await runStep(summary, "Trace: verify readiness attribution", async () => {
				const { res, data } = await quality.get(`/trace/units/${unitSn}?mode=run`);
				const trace = expectOk(res, data, "Trace get unit");

				if (!Array.isArray(trace.inspections)) {
					throw new ApiError("Trace missing inspections");
				}
				const faiInspection = trace.inspections.find((i: any) => i?.type === "FAI");
				if (!faiInspection) {
					throw new ApiError("Trace inspections missing FAI (cannot locate inspection summary)");
				}
				if (faiInspection.status !== "PASS") {
					throw new ApiError(`Trace FAI status=${faiInspection.status}, expected PASS`);
				}

				if (!trace.readiness) {
					throw new ApiError("Trace missing readiness info");
				}
				if (trace.readiness.status !== "PASSED") {
					throw new ApiError(`Trace readiness status is ${trace.readiness.status}, expected PASSED`);
				}
				
				const waivedItems = Array.isArray(trace.readiness.waivedItems) ? trace.readiness.waivedItems : [];
				const waivedTypes = new Set(waivedItems.map((i: any) => i?.itemType));
				for (const expected of ["LOADING", "EQUIPMENT", "STENCIL", "SOLDER_PASTE"]) {
					if (!waivedTypes.has(expected)) {
						throw new ApiError(`Trace readiness missing waived item ${expected}`);
					}
				}

				for (const item of waivedItems) {
					if (targetTypes.has(item?.itemType) && item?.source !== "WAIVE") {
						throw new ApiError(`Trace readiness source=${item?.source} for ${item?.itemType}, expected WAIVE`);
					}
					if (targetTypes.has(item?.itemType) && !item?.waivedBy) {
						throw new ApiError(`Trace readiness missing waivedBy for ${item?.itemType}`);
					}
					if (targetTypes.has(item?.itemType) && !item?.waiveReason) {
						throw new ApiError(`Trace readiness missing waiveReason for ${item?.itemType}`);
					}
				}

				return trace;
			}, { actor: "quality" });

			// End scenario early
			summary.ok = true;
			return summary;
		}

		if (options.withLoading) {
			await runStep(summary, "Loading: verify mismatch (expect FAIL)", async () => {
				const { res, data } = await material.post("/loading/verify", {
					runNo,
					slotCode: options.slotCode,
					materialLotBarcode: `WRONG-MAT|LOT-${Date.now()}`,
					operatorId: options.operatorId,
				});
				const record = expectOk(res, data, "Loading verify (mismatch)");
				if (record.verifyResult === "PASS") {
					throw new ApiError("Loading mismatch unexpectedly PASS");
				}
				return record;
			}, { actor: "material" });

			const lotNo = `LOT-${Date.now()}`;
			await runStep(summary, "Loading: verify expected material (expect PASS)", async () => {
				const { res, data } = await material.post("/loading/verify", {
					runNo,
					slotCode: options.slotCode,
					materialLotBarcode: `${options.materialCode}|${lotNo}`,
					operatorId: options.operatorId,
				});
				const record = expectOk(res, data, "Loading verify (expected)");
				if (record.verifyResult !== "PASS") {
					throw new ApiError(`Loading expected material verifyResult=${record.verifyResult}, expected PASS`);
				}
				return record;
			}, { actor: "material" });
		}

		await runStep(summary, "Readiness: formal check (expect PASS)", async () => {
			const { res, data } = await quality.post(`/runs/${runNo}/readiness/check`);
			const check = expectOk(res, data, "Readiness formal check");
			if (check.status !== "PASSED") {
				throw new ApiError(`Readiness status is ${check.status}, expected PASSED`);
			}
			return check;
		}, { actor: "quality" });

		await runStep(summary, "Run: authorize (expect FAI_NOT_PASSED)", async () => {
			const { res, data } = await planner.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
			if (res.ok && data?.ok) {
				throw new ApiError("Authorize unexpectedly succeeded before FAI");
			}
			const code = data?.error?.code as string | undefined;
			if (code !== "FAI_NOT_PASSED") {
				throw new ApiError(`Authorize failed with ${code ?? res.statusText}, expected FAI_NOT_PASSED`, {
					code,
					status: res.status,
				});
			}
			return data?.error;
		}, { actor: "planner" });

		const stations =
			options.track === "dip"
				? ["ST-DIP-INS-01", "ST-DIP-WAVE-01", "ST-DIP-POST-01", "ST-DIP-TEST-01"]
				: ["ST-PRINT-01", "ST-SPI-01", "ST-MOUNT-01", "ST-REFLOW-01", "ST-AOI-01"];

		const faiId = await runStep(summary, "FAI: create/start (INSPECTING)", async () => {
			const gate = await quality.get(`/fai/run/${runNo}/gate`);
			expectOk(gate.res, gate.data, "FAI gate");

			const created = await quality.post(`/fai/run/${runNo}`, { sampleQty: 1 });
			const fai = expectOk(created.res, created.data, "FAI create");
			const id = fai.id as string;

			const started = await quality.post(`/fai/${id}/start`);
			expectOk(started.res, started.data, "FAI start");

			return id;
		}, { actor: "quality" });

		summary.context.faiId = faiId;

		await runStep(summary, "FAI: trial execution (first step, Run=PREP)", async () => {
			const firstStationCode = stations[0];
			if (!firstStationCode) throw new ApiError("No station code configured for trial execution");

			const inResult = await operator.post(`/stations/${firstStationCode}/track-in`, { sn, woNo, runNo });
			expectOk(inResult.res, inResult.data, `FAI trial track-in ${firstStationCode}`);

			const outResult = await operator.post(`/stations/${firstStationCode}/track-out`, {
				sn,
				runNo,
				result: "PASS",
				operatorId: options.operatorId,
			});
			expectOk(outResult.res, outResult.data, `FAI trial track-out ${firstStationCode}`);

			return { stationCode: firstStationCode };
		}, { actor: "operator" });

		await runStep(summary, "FAI: record/complete (PASS)", async () => {
			const item = await quality.post(`/fai/${faiId}/items`, {
				unitSn: sn,
				itemName: "Visual Inspection",
				result: "PASS",
			});
			expectOk(item.res, item.data, "FAI record item");

			const completed = await quality.post(`/fai/${faiId}/complete`, { decision: "PASS" });
			expectOk(completed.res, completed.data, "FAI complete");

			return { faiId };
		}, { actor: "quality" });

		await runStep(summary, "Run: authorize (expect PASS)", async () => {
			const { res, data } = await planner.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
			return expectOk(res, data, "Run authorize");
		}, { actor: "planner" });

		for (const stationCode of stations.slice(1)) {
			await runStep(summary, `Execution: track-in ${stationCode}`, async () => {
				const { res, data } = await operator.post(`/stations/${stationCode}/track-in`, { sn, woNo, runNo });
				return expectOk(res, data, `Track-in ${stationCode}`);
			}, { actor: "operator" });

			await runStep(summary, `Execution: track-out ${stationCode}`, async () => {
				const { res, data } = await operator.post(`/stations/${stationCode}/track-out`, {
					sn,
					runNo,
					result: "PASS",
					operatorId: options.operatorId,
				});
				return expectOk(res, data, `Track-out ${stationCode}`);
			}, { actor: "operator" });
		}

		// Handle OQC based on scenario
		const isFailScenario = options.scenario.startsWith("oqc-fail");

		await runStep(summary, `Run: closeout (scenario: ${options.scenario})`, async () => {
			const closeAttempt = await planner.post(`/runs/${runNo}/close`);
			if (closeAttempt.res.ok && closeAttempt.data?.ok) {
				// No OQC required, closeout succeeded directly
				return closeAttempt.data.data;
			}

			const code = closeAttempt.data?.error?.code as string | undefined;
			if (code !== "OQC_REQUIRED") {
				throw new ApiError(`Closeout failed: ${closeAttempt.data?.error?.message ?? closeAttempt.res.statusText}`, {
					code,
					status: closeAttempt.res.status,
				});
			}

			// OQC is required - get the OQC task
			const oqc = await quality.get(`/oqc/run/${runNo}`);
			const oqcData = expectOk(oqc.res, oqc.data, "Get OQC by run");
			if (!oqcData?.id) {
				throw new ApiError("OQC_REQUIRED but OQC task not found for run");
			}

			const oqcId = oqcData.id as string;
			summary.context.oqcId = oqcId;

			const started = await quality.post(`/oqc/${oqcId}/start`);
			expectOk(started.res, started.data, "OQC start");

			// Record inspection item (result depends on scenario)
			const itemResult = isFailScenario ? "FAIL" : "PASS";
			const item = await quality.post(`/oqc/${oqcId}/items`, {
				unitSn: sn,
				itemName: "OQC Visual",
				result: itemResult,
				defectCode: isFailScenario ? "DEF-001" : undefined,
				remark: isFailScenario ? "Simulated defect for fail scenario" : undefined,
			});
			expectOk(item.res, item.data, "OQC record item");

			// Complete OQC with decision based on scenario
			const decision = isFailScenario ? "FAIL" : "PASS";
			const completePayload = isFailScenario
				? { decision: "FAIL" as const, failedQty: 1, passedQty: 0 }
				: { decision: "PASS" as const };
			const completed = await quality.post(`/oqc/${oqcId}/complete`, completePayload);
			expectOk(completed.res, completed.data, `OQC complete (${decision})`);

			if (!isFailScenario) {
				// Happy path: closeout after OQC PASS
				const closeFinal = await planner.post(`/runs/${runNo}/close`);
				return expectOk(closeFinal.res, closeFinal.data, "Run closeout (final)");
			}

			// Fail scenario: Run should now be ON_HOLD
			const runAfterOqc = await planner.get(`/runs/${runNo}`);
			// Note: GET /runs/:runNo returns { run: { status, ... }, ... } structure
			if (!runAfterOqc.res.ok) {
				throw new ApiError(`Get run after OQC FAIL failed: ${runAfterOqc.res.statusText}`, {
					status: runAfterOqc.res.status,
				});
			}
			const runStatus = runAfterOqc.data?.run?.status;
			if (runStatus !== "ON_HOLD") {
				throw new ApiError(`Run status after OQC FAIL is ${runStatus}, expected ON_HOLD`);
			}

			return { oqcDecision: decision, runStatus };
		}, { actor: "planner/quality" });

		// MRB decision for fail scenarios
		if (isFailScenario) {
			const mrbDecision = options.scenario === "oqc-fail-mrb-release" ? "RELEASE" : "SCRAP";
			summary.context.mrbDecision = mrbDecision;

			await runStep(summary, `MRB: decision ${mrbDecision}`, async () => {
				const { res, data } = await quality.post(`/runs/${runNo}/mrb-decision`, {
					decision: mrbDecision,
					reason: `Acceptance test: ${mrbDecision} decision for scenario ${options.scenario}`,
				});
				const result = expectOk(res, data, `MRB ${mrbDecision}`);

				// Verify final run status
				const expectedStatus = mrbDecision === "RELEASE" ? "COMPLETED" : "SCRAPPED";
				if (result.run?.status !== expectedStatus) {
					throw new ApiError(`Run status after MRB ${mrbDecision} is ${result.run?.status}, expected ${expectedStatus}`);
				}

				return result;
			}, { actor: "quality" });
		}

		// Trace verification (adjust expectations for fail scenarios)
		await runStep(summary, "Trace: verify", async () => {
			const { res, data } = await quality.get(`/trace/units/${sn}?mode=run`);
			const trace = expectOk(res, data, "Trace get unit");

			if (trace.route?.code !== options.routeCode) {
				throw new ApiError(`Trace route.code=${trace.route?.code}, expected ${options.routeCode}`);
			}

			if (!Array.isArray(trace.inspections)) {
				throw new ApiError("Trace missing inspections");
			}
			const faiInspection = trace.inspections.find((i: any) => i?.type === "FAI");
			if (!faiInspection) {
				throw new ApiError("Trace inspections missing FAI (cannot locate inspection summary)");
			}
			if (faiInspection.status !== "PASS") {
				throw new ApiError(`Trace FAI status=${faiInspection.status}, expected PASS`);
			}

			if (options.withLoading) {
				if (!Array.isArray(trace.loadingRecords)) {
					throw new ApiError("Trace missing loadingRecords");
				}
				const slotRecords = trace.loadingRecords.filter((r: any) => r?.slotCode === options.slotCode);
				if (slotRecords.length === 0) {
					throw new ApiError(`Trace loadingRecords missing slotCode=${options.slotCode} (cannot locate loading summary)`);
				}
				const hasExpectedPass = slotRecords.some(
					(r: any) => r?.materialCode === options.materialCode && r?.verifyResult === "PASS",
				);
				if (!hasExpectedPass) {
					throw new ApiError(`Trace loadingRecords missing PASS for materialCode=${options.materialCode} at slotCode=${options.slotCode}`);
				}
			}

			const passTracks = Array.isArray(trace.tracks)
				? trace.tracks.filter((t: any) => t?.result === "PASS").length
				: 0;
			if (passTracks !== stations.length) {
				throw new ApiError(`Trace PASS tracks=${passTracks}, expected ${stations.length}`);
			}

			const stepCount = Array.isArray(trace.steps) ? trace.steps.length : 0;
			if (stepCount !== stations.length) {
				throw new ApiError(`Trace steps=${stepCount}, expected ${stations.length}`);
			}

			// For fail scenarios, verify OQC result in trace
			if (isFailScenario) {
				const oqcInspection = trace.inspections.find((i: any) => i?.type === "OQC");
				if (!oqcInspection) {
					throw new ApiError("Trace inspections missing OQC for fail scenario");
				}
				if (oqcInspection.status !== "FAIL") {
					throw new ApiError(`Trace OQC status=${oqcInspection.status}, expected FAIL for fail scenario`);
				}
			}

			return trace;
		}, { actor: "quality" });

		summary.ok = true;
		return summary;
	} catch (error) {
		summary.ok = false;
		summary.error = {
			message: error instanceof Error ? error.message : String(error),
		};
		return summary;
	} finally {
		if (restoreReadinessConfig) {
			try {
				await runStep(
					summary,
					"Line: restore readiness config",
					async () => {
						const { res, data } = await engineer.put(
							`/lines/${restoreReadinessConfig.lineId}/readiness-config`,
							{ enabled: restoreReadinessConfig.enabled },
						);
						return expectOk(res, data, "Restore readiness config");
					},
					{ actor: "engineer" },
				);
			} catch {
				// Best-effort cleanup (avoid masking the main failure).
			}
		}
		if (samplingRuleId) {
			try {
				await runStep(
					summary,
					"OQC: cleanup sampling rule",
					async () => {
						const { res, data } = await quality.request(
							"DELETE",
							`/oqc/sampling-rules/${samplingRuleId}`,
						);
						return expectOk(res, data, "Delete OQC sampling rule");
					},
					{ actor: "quality" },
				);
			} catch {
				// Best-effort cleanup (avoid masking the main failure).
			}
		}
		summary.endedAt = isoNow();
		summary.durationMs = Date.now() - Date.parse(summary.startedAt);
	}
}

async function main() {
	const options = parseCliOptions();
	const summary = await runTest(options);

	console.log("MES Flow Acceptance Summary");
	console.log(
		`track=${options.track} scenario=${options.scenario} ok=${summary.ok} line=${options.lineCode} route=${options.routeCode} idStrategy=${options.idStrategy} dataset=${options.dataset} runNo=${summary.context.runNo ?? "-"} woNo=${summary.context.woNo ?? "-"}`,
	);
	if (summary.context.mrbDecision) {
		console.log(`mrbDecision=${summary.context.mrbDecision}`);
	}
	for (const step of summary.steps) {
		const status = step.ok ? "OK" : "FAIL";
		const extra = step.ok ? "" : ` code=${step.error?.code ?? "-"} msg=${step.error?.message ?? "-"}`;
		console.log(`${status} ${step.name} (${step.durationMs}ms)${extra}`);
	}

	if (options.json) {
		console.log(JSON.stringify(summary, null, 2));
	}

	if (options.jsonFile) {
		await Bun.write(options.jsonFile, JSON.stringify(summary, null, 2));
	}

	if (!summary.ok) {
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
