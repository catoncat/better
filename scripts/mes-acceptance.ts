type Track = "smt" | "dip";
type Scenario = "happy" | "oqc-fail-mrb-release" | "oqc-fail-mrb-scrap" | "readiness-waive";
type IdStrategy = "unique" | "reuse-wo";

type Options = {
	databaseUrl: string;
	host: string;
	port: number;
	track: Track;
	scenario: Scenario;
	idStrategy: IdStrategy;
	dataset: string;
	withLoading: boolean;
	json: boolean;
	jsonFile?: string;
	junitFile?: string;
};

const parseArgs = (argv: string[]): Options => {
	const getArgValue = (key: string) => {
		const eq = argv.find((a) => a.startsWith(`${key}=`));
		if (eq) return eq.slice(key.length + 1);
		const idx = argv.indexOf(key);
		if (idx >= 0) return argv[idx + 1];
		return undefined;
	};

	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(
			[
				"Usage: bun scripts/mes-acceptance.ts [options]",
				"",
				"This runs against a dedicated acceptance DB and never touches your main DB.",
				"",
				"Options:",
				"  --db <fileUrl>          DATABASE_URL (default: file:./data/acceptance.db)",
				"  --host <host>           Server host (default: 127.0.0.1)",
				"  --port <port>           Server port (default: 3002)",
				"  --track <smt|dip>       Track (default: smt)",
				"  --scenario <name>       Scenario (default: happy)",
				"  --id-strategy <mode>    unique|reuse-wo (default: reuse-wo)",
				"  --dataset <key>         Dataset key (default: acceptance)",
				"  --with-loading          Force loading steps",
				"  --skip-loading          Skip loading steps",
				"  --json                  Print JSON summary",
				"  --json-file <path>      Write JSON summary to file",
				"  --junit-file <path>     Write JUnit XML report to file",
			].join("\n"),
		);
		process.exit(0);
	}

	const databaseUrl = getArgValue("--db") ?? "file:./data/acceptance.db";
	const host = getArgValue("--host") ?? "127.0.0.1";

	const portRaw = getArgValue("--port") ?? "3002";
	const port = Number(portRaw);
	if (!Number.isFinite(port) || port <= 0) {
		console.error(`Invalid --port: ${portRaw}`);
		process.exit(1);
	}

	const trackArg = (getArgValue("--track") ?? "smt").toLowerCase();
	const track: Track = trackArg === "dip" ? "dip" : "smt";

	const scenarioArg = (getArgValue("--scenario") ?? "happy").toLowerCase();
	const validScenarios: Scenario[] = ["happy", "oqc-fail-mrb-release", "oqc-fail-mrb-scrap", "readiness-waive"];
	if (!validScenarios.includes(scenarioArg as Scenario)) {
		console.error(`Invalid --scenario: ${scenarioArg}. Valid: ${validScenarios.join(", ")}`);
		process.exit(1);
	}
	const scenario = scenarioArg as Scenario;

	const idStrategyArg = (getArgValue("--id-strategy") ?? "reuse-wo").toLowerCase();
	const idStrategy: IdStrategy = idStrategyArg === "unique" ? "unique" : "reuse-wo";

	const datasetRaw = getArgValue("--dataset") ?? "acceptance";
	const dataset = datasetRaw.trim() || "acceptance";

	const withLoadingFlag = argv.includes("--with-loading");
	const skipLoadingFlag = argv.includes("--skip-loading");
	const withLoading = withLoadingFlag ? true : skipLoadingFlag ? false : track !== "dip";

	return {
		databaseUrl,
		host,
		port,
		track,
		scenario,
		idStrategy,
		dataset,
		withLoading,
		json: argv.includes("--json"),
		jsonFile: getArgValue("--json-file"),
		junitFile: getArgValue("--junit-file"),
	};
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = async (
	cmd: string[],
	options: { env?: Record<string, string>; cwd?: string },
) => {
	const proc = Bun.spawn(cmd, {
		cwd: options.cwd,
		env: { ...process.env, ...(options.env ?? {}) },
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Command failed (${exitCode}): ${cmd.join(" ")}`);
	}
};

const waitForHealth = async (apiUrl: string, timeoutMs: number) => {
	const startedAt = Date.now();
	let lastError: unknown = null;

	while (Date.now() - startedAt < timeoutMs) {
		try {
			const res = await fetch(`${apiUrl}/health`);
			if (res.ok) return;
			lastError = new Error(`health status=${res.status}`);
		} catch (error) {
			lastError = error;
		}
		await sleep(200);
	}

	throw new Error(`Server health check timed out (${timeoutMs}ms): ${String(lastError)}`);
};

const main = async () => {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	const apiUrl = `http://${options.host}:${options.port}/api`;
	console.log(`Acceptance DB: ${options.databaseUrl}`);
	console.log(`Server: ${apiUrl}`);

	const env = {
		DATABASE_URL: options.databaseUrl,
		HOST: options.host,
		PORT: String(options.port),
		MES_API_URL: apiUrl,
	};

	await runCommand(["bun", "run", "db:deploy"], { env });
	await runCommand(["bun", "run", "db:seed"], { env });

	const server = Bun.spawn(["bun", "run", "--filter", "server", "dev"], {
		env: { ...process.env, ...env },
		stdout: "inherit",
		stderr: "inherit",
	});

	try {
		await waitForHealth(apiUrl, 30_000);

		const flowArgs: string[] = [
			"apps/server/scripts/test-mes-flow.ts",
			"--track",
			options.track,
			"--scenario",
			options.scenario,
			"--id-strategy",
			options.idStrategy,
			"--dataset",
			options.dataset,
		];
		if (options.withLoading) flowArgs.push("--with-loading");
		else flowArgs.push("--skip-loading");
		if (options.json) flowArgs.push("--json");
		if (options.jsonFile) flowArgs.push("--json-file", options.jsonFile);
		if (options.junitFile) flowArgs.push("--junit-file", options.junitFile);

		await runCommand(["bun", ...flowArgs], { env: { MES_API_URL: apiUrl } });
	} finally {
		server.kill();
		await Promise.race([server.exited, sleep(3000)]);
	}
};

await main().catch((error) => {
	console.error(error);
	process.exit(1);
});
