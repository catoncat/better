import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type StepKind = "command" | "bun" | "assert.gitClean";

type RetryPolicy = {
	attempts: number;
	backoffMs?: number;
};

type WorkflowStep = {
	id: string;
	title?: string;
	kind: StepKind;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	retry?: RetryPolicy;
	requiresHuman?: boolean;
	parallelGroup?: string;
	captureStdoutTo?: string;
	captureStderrTo?: string;
};

type WorkflowSpec = {
	name: string;
	version: number;
	description?: string;
	steps: WorkflowStep[];
};

type RunStepResult = {
	stepId: string;
	attempt: number;
	startedAt: string;
	finishedAt: string;
	ok: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	stdoutPath: string;
	stderrPath: string;
};

type RunSummaryStep = {
	id: string;
	title?: string;
	kind: StepKind;
	ok: boolean;
	attempts: number;
	exitCode: number;
	startedAt: string;
	finishedAt: string;
	stdoutPath: string;
	stderrPath: string;
};

type RunSummary = {
	workflow: { name: string; version: number; specPath: string };
	runDir: string;
	startedAt: string;
	finishedAt: string | null;
	status: "running" | "failed" | "succeeded";
	steps: RunSummaryStep[];
};

const usage = (): never => {
	console.error(
		[
			"Usage:",
			"  bun scripts/workflow-run.ts <workflowSpecPath>",
			"",
			"Options:",
			"  --dry-run                 Print steps and exit",
			"  --from <stepId>            Start from a step",
			"  --only <stepId>            Run only one step",
			"  --approve <stepId>         Approve a requiresHuman step (repeatable)",
			"  --run-dir <path>           Override output run dir",
		].join("\n"),
	);
	process.exit(1);
};

const pad2 = (value: number) => value.toString().padStart(2, "0");

const formatTimestamp = (date: Date): string => {
	const year = date.getFullYear();
	const month = pad2(date.getMonth() + 1);
	const day = pad2(date.getDate());
	const hour = pad2(date.getHours());
	const minute = pad2(date.getMinutes());
	const second = pad2(date.getSeconds());
	return `${year}-${month}-${day}_${hour}${minute}${second}`;
};

const readJson = <T>(filePath: string): T => {
	const raw = readFileSync(filePath, "utf8");
	try {
		return JSON.parse(raw) as T;
	} catch (error) {
		throw new Error(`Invalid JSON: ${filePath}: ${String(error)}`);
	}
};

const ensureDir = (dirPath: string) => {
	mkdirSync(dirPath, { recursive: true });
};

const writeText = (filePath: string, content: string) => {
	ensureDir(path.dirname(filePath));
	writeFileSync(filePath, content, "utf8");
};

const appendNdjson = (filePath: string, value: unknown) => {
	ensureDir(path.dirname(filePath));
	writeFileSync(filePath, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "a" });
};

const parseArgs = (argv: string[]) => {
	const args = argv.slice(2);
	const specPath = args[0];
	if (!specPath) usage();

	let dryRun = false;
	let fromStep: string | null = null;
	let onlyStep: string | null = null;
	const approved = new Set<string>();
	let runDirOverride: string | null = null;

	for (let i = 1; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") usage();
		if (arg === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (arg === "--from") {
			fromStep = args[i + 1] ?? null;
			if (!fromStep) usage();
			i += 1;
			continue;
		}
		if (arg === "--only") {
			onlyStep = args[i + 1] ?? null;
			if (!onlyStep) usage();
			i += 1;
			continue;
		}
		if (arg === "--approve") {
			const stepId = args[i + 1] ?? null;
			if (!stepId) usage();
			approved.add(stepId);
			i += 1;
			continue;
		}
		if (arg === "--run-dir") {
			runDirOverride = args[i + 1] ?? null;
			if (!runDirOverride) usage();
			i += 1;
			continue;
		}
		usage();
	}

	return { specPath, dryRun, fromStep, onlyStep, approved, runDirOverride };
};

const normalizeSpec = (specPath: string, spec: WorkflowSpec): WorkflowSpec => {
	if (!spec.name?.trim()) throw new Error(`Workflow missing "name": ${specPath}`);
	if (!Number.isFinite(spec.version)) throw new Error(`Workflow missing/invalid "version": ${specPath}`);
	if (!Array.isArray(spec.steps) || spec.steps.length === 0)
		throw new Error(`Workflow missing "steps": ${specPath}`);

	const ids = new Set<string>();
	for (const step of spec.steps) {
		if (!step.id?.trim()) throw new Error(`Step missing "id": ${specPath}`);
		if (ids.has(step.id)) throw new Error(`Duplicate step id "${step.id}": ${specPath}`);
		ids.add(step.id);
		if (!step.kind) throw new Error(`Step "${step.id}" missing "kind": ${specPath}`);
		if (step.kind === "command" || step.kind === "bun") {
			if (!step.args || step.args.length === 0)
				throw new Error(`Step "${step.id}" missing "args": ${specPath}`);
		}
	}

	return spec;
};

const runGitCleanAssert = async (cwd: string) => {
	const proc = Bun.spawn(["git", "status", "--porcelain"], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;
	const dirty = stdout.trim().length > 0;
	return { exitCode, stdout, stderr, ok: exitCode === 0 && !dirty };
};

const spawnCollect = async (cmd: string[], options: { cwd: string; env: Record<string, string> }) => {
	const proc = Bun.spawn(cmd, {
		cwd: options.cwd,
		env: options.env,
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { stdout, stderr, exitCode };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runOneStepAttempt = async (params: {
	repoRoot: string;
	runDir: string;
	workflowName: string;
	step: WorkflowStep;
	attempt: number;
}): Promise<RunStepResult> => {
	const startedAt = new Date().toISOString();

	const cwd = params.step.cwd ? path.resolve(params.repoRoot, params.step.cwd) : params.repoRoot;
	const outputsDir = path.join(params.runDir, "outputs");

	const stdoutRel = params.step.captureStdoutTo ?? path.join("outputs", `${params.step.id}.stdout.log`);
	const stderrRel = params.step.captureStderrTo ?? path.join("outputs", `${params.step.id}.stderr.log`);
	const stdoutPath = path.join(params.runDir, stdoutRel);
	const stderrPath = path.join(params.runDir, stderrRel);

	let exitCode = 1;
	let stdout = "";
	let stderr = "";
	let ok = false;

	if (params.step.kind === "assert.gitClean") {
		const res = await runGitCleanAssert(cwd);
		exitCode = res.ok ? 0 : res.exitCode === 0 ? 3 : res.exitCode;
		stdout = res.stdout;
		stderr = res.stderr;
		ok = res.ok;
	} else {
		const env = {
			...process.env,
			...(params.step.env ?? {}),
			WORKFLOW_NAME: params.workflowName,
			WORKFLOW_RUN_DIR: params.runDir,
			WORKFLOW_STEP_ID: params.step.id,
			WORKFLOW_STEP_ATTEMPT: String(params.attempt),
			WORKFLOW_OUTPUTS_DIR: outputsDir,
		};

		const cmd = params.step.kind === "bun" ? ["bun", ...params.step.args!] : params.step.args!;
		const res = await spawnCollect(cmd, { cwd, env });
		exitCode = res.exitCode;
		stdout = res.stdout;
		stderr = res.stderr;
		ok = exitCode === 0;
	}

	writeText(stdoutPath, stdout);
	writeText(stderrPath, stderr);

	if (stdout.trim()) process.stdout.write(stdout);
	if (stderr.trim()) process.stderr.write(stderr);

	const finishedAt = new Date().toISOString();
	return {
		stepId: params.step.id,
		attempt: params.attempt,
		startedAt,
		finishedAt,
		ok,
		exitCode,
		stdout,
		stderr,
		stdoutPath: path.relative(params.repoRoot, stdoutPath),
		stderrPath: path.relative(params.repoRoot, stderrPath),
	};
};

const runStepWithRetry = async (params: {
	repoRoot: string;
	runDir: string;
	workflowName: string;
	step: WorkflowStep;
	logPath: string;
}): Promise<{ ok: boolean; attempts: number; last: RunStepResult }> => {
	const retry = params.step.retry ?? { attempts: 1 };
	const attempts = Math.max(1, retry.attempts);
	const backoffMs = retry.backoffMs ?? 0;

	let last: RunStepResult | null = null;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		appendNdjson(params.logPath, {
			type: "step.start",
			stepId: params.step.id,
			attempt,
			at: new Date().toISOString(),
		});

		const res = await runOneStepAttempt({
			repoRoot: params.repoRoot,
			runDir: params.runDir,
			workflowName: params.workflowName,
			step: params.step,
			attempt,
		});
		last = res;

		appendNdjson(params.logPath, {
			type: "step.finish",
			stepId: params.step.id,
			attempt,
			ok: res.ok,
			exitCode: res.exitCode,
			stdoutPath: res.stdoutPath,
			stderrPath: res.stderrPath,
			at: new Date().toISOString(),
		});

		if (res.ok) return { ok: true, attempts: attempt, last: res };

		if (attempt < attempts && backoffMs > 0) await sleep(backoffMs);
	}

	return { ok: false, attempts, last: last ?? ({} as RunStepResult) };
};

const main = async () => {
	const repoRoot = process.cwd();
	const { specPath, dryRun, fromStep, onlyStep, approved, runDirOverride } = parseArgs(process.argv);

	const specAbs = path.resolve(repoRoot, specPath);
	const spec = normalizeSpec(specAbs, readJson<WorkflowSpec>(specAbs));

	const stepsAll = spec.steps;
	const steps = (() => {
		if (onlyStep != null) return stepsAll.filter((s) => s.id === onlyStep);
		if (fromStep != null) {
			const idx = stepsAll.findIndex((s) => s.id === fromStep);
			if (idx === -1) return [];
			return stepsAll.slice(idx);
		}
		return stepsAll;
	})();

	if (onlyStep && steps.length === 0) throw new Error(`--only step not found: ${onlyStep}`);
	if (fromStep && steps.length === 0) throw new Error(`--from step not found: ${fromStep}`);

	if (dryRun) {
		console.log(`# Workflow: ${spec.name} v${spec.version}`);
		for (const step of steps) {
			const title = step.title ? ` — ${step.title}` : "";
			console.log(`- ${step.id}${title} (${step.kind})`);
		}
		return;
	}

	const runDir =
		runDirOverride ??
		path.join(repoRoot, ".spec-workflow", "runs", spec.name, formatTimestamp(new Date()));
	ensureDir(runDir);

	const logPath = path.join(runDir, "logs.ndjson");
	const runJsonPath = path.join(runDir, "run.json");

	const summary: RunSummary = {
		workflow: { name: spec.name, version: spec.version, specPath: path.relative(repoRoot, specAbs) },
		runDir: path.relative(repoRoot, runDir),
		startedAt: new Date().toISOString(),
		finishedAt: null,
		status: "running",
		steps: [],
	};
	writeText(runJsonPath, `${JSON.stringify(summary, null, 2)}\n`);

	appendNdjson(logPath, {
		type: "run.start",
		at: summary.startedAt,
		workflow: summary.workflow,
		runDir: summary.runDir,
	});

	const pushStepSummary = (s: RunSummaryStep) => {
		summary.steps.push(s);
		writeText(runJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
	};

	let i = 0;
	while (i < steps.length) {
		const step = steps[i]!;
		if (step.requiresHuman && !approved.has(step.id)) {
			const message = `Step requires human approval: ${step.id} (re-run with --approve ${step.id})`;
			appendNdjson(logPath, { type: "run.blocked", at: new Date().toISOString(), stepId: step.id, message });
			throw new Error(message);
		}

		const group = step.parallelGroup;
		if (group) {
			const groupSteps: WorkflowStep[] = [];
			let j = i;
			while (j < steps.length && steps[j]?.parallelGroup === group) {
				const s = steps[j]!;
				if (s.requiresHuman && !approved.has(s.id)) {
					throw new Error(`Step requires human approval: ${s.id} (re-run with --approve ${s.id})`);
				}
				groupSteps.push(s);
				j += 1;
			}

			const results = await Promise.all(
				groupSteps.map(async (s) => {
					const r = await runStepWithRetry({
						repoRoot,
						runDir,
						workflowName: spec.name,
						step: s,
						logPath,
					});
					pushStepSummary({
						id: s.id,
						title: s.title,
						kind: s.kind,
						ok: r.ok,
						attempts: r.attempts,
						exitCode: r.last.exitCode,
						startedAt: r.last.startedAt,
						finishedAt: r.last.finishedAt,
						stdoutPath: r.last.stdoutPath,
						stderrPath: r.last.stderrPath,
					});
					return { step: s, ...r };
				}),
			);

			const failed = results.find((r) => !r.ok);
			if (failed) throw new Error(`Parallel group "${group}" failed at step: ${failed.step.id}`);
			i = j;
			continue;
		}

		const r = await runStepWithRetry({ repoRoot, runDir, workflowName: spec.name, step, logPath });
		pushStepSummary({
			id: step.id,
			title: step.title,
			kind: step.kind,
			ok: r.ok,
			attempts: r.attempts,
			exitCode: r.last.exitCode,
			startedAt: r.last.startedAt,
			finishedAt: r.last.finishedAt,
			stdoutPath: r.last.stdoutPath,
			stderrPath: r.last.stderrPath,
		});
		if (!r.ok) throw new Error(`Step failed: ${step.id} (exitCode=${r.last.exitCode})`);

		i += 1;
	}

	summary.finishedAt = new Date().toISOString();
	summary.status = "succeeded";
	writeText(runJsonPath, `${JSON.stringify(summary, null, 2)}\n`);

	appendNdjson(logPath, { type: "run.finish", at: summary.finishedAt, status: summary.status });

	console.log(`Workflow succeeded: ${spec.name}`);
	console.log(`Run dir: ${path.relative(repoRoot, runDir)}`);
};

await main().catch((error) => {
	console.error(error);
	process.exit(1);
});
