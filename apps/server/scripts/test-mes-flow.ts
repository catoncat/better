import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

type Scenario = "happy" | "oqc-fail-mrb-release" | "oqc-fail-mrb-scrap" | "readiness-waive";

type CliOptions = {
	apiUrl: string;
	adminEmail: string;
	adminPassword: string;
	testPassword: string;
	lineCode: string;
	routeCode: string;
	productCode: string;
	slotCode: string;
	materialCode: string;
	operatorId: string;
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
				"  --scenario <name>      Scenario to run (default: happy)",
				"                         - happy: OQC PASS → Run COMPLETED",
				"                         - oqc-fail-mrb-release: OQC FAIL → MRB RELEASE → Run COMPLETED",
				"                         - oqc-fail-mrb-scrap: OQC FAIL → MRB SCRAP → Run SCRAPPED",
				"                         - readiness-waive: Readiness FAIL (Loading) → Waive → Authorize PASS",
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

	return {
		apiUrl: getArgValue("--api-url") ?? apiUrl,
		adminEmail: getArgValue("--email") ?? adminEmail,
		adminPassword: getArgValue("--password") ?? adminPassword,
		testPassword: getArgValue("--test-password") ?? testPassword,
		lineCode: "LINE-A",
		routeCode: "PCBA-STD-V1",
		productCode: "P-1001",
		slotCode: "SLOT-01",
		materialCode: "MAT-001",
		operatorId: "OP-01",
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
	const leader = new ApiClient(options.apiUrl);
	const quality = new ApiClient(options.apiUrl);

	const engineerEmail = "engineer@example.com";
	const plannerEmail = "planner@example.com";
	const leaderEmail = "leader@example.com";
	const qualityEmail = "quality@example.com";
	const woNo = `WO-TEST-${Date.now()}`;
	const sn = `SN-TEST-${Date.now()}`;
	let samplingRuleId: string | undefined;

	summary.context.woNo = woNo;
	summary.context.sn = sn;

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
			"Auth: login leader",
			() => leader.login(leaderEmail, options.testPassword),
			{ actor: "leader" },
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
			return expectOk(res, data, "WO release");
		}, { actor: "planner" });

		const runNo = await runStep(summary, "Run: create", async () => {
			const { res, data } = await leader.post(`/work-orders/${woNo}/runs`, { lineCode: options.lineCode });
			const created = expectOk(res, data, "Run create");
			if (!created.runNo) {
				throw new ApiError("Run create response missing runNo");
			}
			return created.runNo as string;
		}, { actor: "leader" });

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

		await runStep(summary, "Loading: load slot expectations", async () => {
			const { res, data } = await leader.post(`/runs/${runNo}/loading/load-table`);
			return expectOk(res, data, "Load slot table");
		}, { actor: "leader" });

		if (options.scenario === "readiness-waive") {
			// Intentionally SKIP verify to cause Loading check failure (PENDING)
			const check = await runStep(summary, "Readiness: formal check (expect FAIL)", async () => {
				const { res, data } = await leader.post(`/runs/${runNo}/readiness/check`);
				// Note: check API returns 200 even on FAIL, but data.status should be FAILED
				const result = expectOk(res, data, "Readiness formal check");
				if (result.status !== "FAILED") {
					throw new ApiError(`Readiness status is ${result.status}, expected FAILED`);
				}
				return result;
			}, { actor: "leader" });

			const loadingItem = check.items.find((i: any) => i.itemType === "LOADING" && i.status === "FAILED");
			if (!loadingItem) {
				throw new ApiError("Readiness FAIL but no failed LOADING item found");
			}

			await runStep(summary, "Readiness: waive item", async () => {
				const { res, data } = await leader.post(`/runs/${runNo}/readiness/items/${loadingItem.id}/waive`, {
					reason: "Acceptance test waive",
				});
				return expectOk(res, data, "Waive item");
			}, { actor: "leader" });

			await runStep(summary, "Readiness: verify waived status (expect PASS)", async () => {
				// Use GET /latest instead of POST /check to verify the WAIVER persists on the current check
				const { res, data } = await leader.get(`/runs/${runNo}/readiness/latest?type=FORMAL`);
				const result = expectOk(res, data, "Readiness latest check");
				
				if (result.status !== "PASSED") {
					throw new ApiError(`Readiness status is ${result.status}, expected PASSED after waive`);
				}

				const waivedItem = result.items.find((i: any) => i.id === loadingItem.id);
				if (!waivedItem || waivedItem.status !== "WAIVED") {
					throw new ApiError("Item status is not WAIVED");
				}
				// Verify attribution
				// The seed user "leader" has id from DB. We don't know the exact UUID here easily without fetching user,
				// but we can check if it is not null.
				if (!waivedItem.waivedBy) {
					throw new ApiError("Item waivedBy is missing (attribution check failed)");
				}

				return result;
			}, { actor: "leader" });

			await runStep(summary, "Run: authorize (expect FAI error, confirming Readiness passed)", async () => {
				const { res, data } = await leader.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
				// We expect FAI_NOT_PASSED. If it was READINESS_CHECK_FAILED, then our waive didn't work.
				if (res.ok && data?.ok) {
					throw new ApiError("Authorize unexpectedly succeeded (expected FAI_NOT_PASSED)");
				}
				const code = data?.error?.code;
				if (code !== "FAI_NOT_PASSED") {
					throw new ApiError(`Authorize failed with ${code}, expected FAI_NOT_PASSED (which implies Readiness passed)`);
				}
				return data?.error;
			}, { actor: "leader" });

			// End scenario early
			summary.ok = true;
			return summary;
		}

		await runStep(summary, "Loading: verify mismatch (expect FAIL)", async () => {
			const { res, data } = await leader.post("/loading/verify", {
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
		}, { actor: "leader" });

		const lotNo = `LOT-${Date.now()}`;
		await runStep(summary, "Loading: verify expected material (expect PASS)", async () => {
			const { res, data } = await leader.post("/loading/verify", {
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
		}, { actor: "leader" });

		await runStep(summary, "Readiness: formal check (expect PASS)", async () => {
			const { res, data } = await leader.post(`/runs/${runNo}/readiness/check`);
			const check = expectOk(res, data, "Readiness formal check");
			if (check.status !== "PASSED") {
				throw new ApiError(`Readiness status is ${check.status}, expected PASSED`);
			}
			return check;
		}, { actor: "leader" });

		await runStep(summary, "Run: authorize (expect FAI_NOT_PASSED)", async () => {
			const { res, data } = await leader.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
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
		}, { actor: "leader" });

		const faiId = await runStep(summary, "FAI: create/start/record/complete (PASS)", async () => {
			const gate = await quality.get(`/fai/run/${runNo}/gate`);
			expectOk(gate.res, gate.data, "FAI gate");

			const created = await quality.post(`/fai/run/${runNo}`, { sampleQty: 1 });
			const fai = expectOk(created.res, created.data, "FAI create");
			const id = fai.id as string;

			const started = await quality.post(`/fai/${id}/start`);
			expectOk(started.res, started.data, "FAI start");

			const item = await quality.post(`/fai/${id}/items`, { itemName: "Visual Inspection", result: "PASS" });
			expectOk(item.res, item.data, "FAI record item");

			const completed = await quality.post(`/fai/${id}/complete`, { decision: "PASS" });
			expectOk(completed.res, completed.data, "FAI complete");

			return id;
		}, { actor: "quality" });

		summary.context.faiId = faiId;

		await runStep(summary, "Run: authorize (expect PASS)", async () => {
			const { res, data } = await leader.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
			return expectOk(res, data, "Run authorize");
		}, { actor: "leader" });

		const stations = ["ST-PRINT-01", "ST-SPI-01", "ST-MOUNT-01", "ST-REFLOW-01", "ST-AOI-01"];
		for (const stationCode of stations) {
			await runStep(summary, `Execution: track-in ${stationCode}`, async () => {
				const { res, data } = await leader.post(`/stations/${stationCode}/track-in`, { sn, woNo, runNo });
				return expectOk(res, data, `Track-in ${stationCode}`);
			}, { actor: "leader" });

			await runStep(summary, `Execution: track-out ${stationCode}`, async () => {
				const { res, data } = await leader.post(`/stations/${stationCode}/track-out`, {
					sn,
					runNo,
					result: "PASS",
					operatorId: options.operatorId,
				});
				return expectOk(res, data, `Track-out ${stationCode}`);
			}, { actor: "leader" });
		}

		// Handle OQC based on scenario
		const isFailScenario = options.scenario.startsWith("oqc-fail");

		await runStep(summary, `Run: closeout (scenario: ${options.scenario})`, async () => {
			const closeAttempt = await leader.post(`/runs/${runNo}/close`);
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
				const closeFinal = await leader.post(`/runs/${runNo}/close`);
				return expectOk(closeFinal.res, closeFinal.data, "Run closeout (final)");
			}

			// Fail scenario: Run should now be ON_HOLD
			const runAfterOqc = await leader.get(`/runs/${runNo}`);
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
		}, { actor: "leader/quality" });

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
			const { res, data } = await leader.get(`/trace/units/${sn}?mode=run`);
			const trace = expectOk(res, data, "Trace get unit");

			if (trace.route?.code !== options.routeCode) {
				throw new ApiError(`Trace route.code=${trace.route?.code}, expected ${options.routeCode}`);
			}

			const passTracks = Array.isArray(trace.tracks)
				? trace.tracks.filter((t: any) => t?.result === "PASS").length
				: 0;
			if (passTracks !== 5) {
				throw new ApiError(`Trace PASS tracks=${passTracks}, expected 5`);
			}

			const stepCount = Array.isArray(trace.steps) ? trace.steps.length : 0;
			if (stepCount !== 5) {
				throw new ApiError(`Trace steps=${stepCount}, expected 5`);
			}

			// For fail scenarios, verify OQC result in trace if available
			if (isFailScenario && trace.inspections) {
				const oqcInspection = trace.inspections.find((i: any) => i.type === "OQC");
				if (oqcInspection && oqcInspection.status !== "FAIL") {
					throw new ApiError(`Trace OQC status=${oqcInspection.status}, expected FAIL for fail scenario`);
				}
			}

			return trace;
		}, { actor: "leader" });

		summary.ok = true;
		return summary;
	} catch (error) {
		summary.ok = false;
		summary.error = {
			message: error instanceof Error ? error.message : String(error),
		};
		return summary;
	} finally {
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
	console.log(`scenario=${options.scenario} ok=${summary.ok} runNo=${summary.context.runNo ?? "-"} woNo=${summary.context.woNo ?? "-"}`);
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
