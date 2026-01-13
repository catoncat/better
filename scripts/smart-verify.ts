type RunResult = {
	stdout: string;
	stderr: string;
	exitCode: number;
};

const die = (message: string): never => {
	console.error(message);
	process.exit(1);
};

const usage = (): never => {
	die(
		[
			"Usage:",
			"  bun scripts/smart-verify.ts [options]",
			"",
			"Options:",
			"  --base <ref>   Base ref for committed diff (default: auto-detect)",
			"  --force        Always run verification even if doc-only",
			"  --help, -h     Show help",
			"",
			"Behavior:",
			"- Collects changed files from: staged + unstaged + committed (<base>...HEAD).",
			"- If all changed files are doc-only, it skips lint/typecheck (exit 0).",
			"- Otherwise it runs: `bun run lint` and `bun run check-types`.",
		].join("\n"),
	);
};

const run = (cmd: string[], options: { cwd: string }): RunResult => {
	const proc = Bun.spawnSync(cmd, {
		cwd: options.cwd,
		stdout: "pipe",
		stderr: "pipe",
	});

	return {
		stdout: new TextDecoder().decode(proc.stdout ?? new Uint8Array()),
		stderr: new TextDecoder().decode(proc.stderr ?? new Uint8Array()),
		exitCode: proc.exitCode,
	};
};

const runInherit = async (cmd: string[], options: { cwd: string }): Promise<number> => {
	const proc = Bun.spawn(cmd, {
		cwd: options.cwd,
		stdout: "inherit",
		stderr: "inherit",
	});
	return await proc.exited;
};

const parseArgs = (argv: string[]) => {
	const args = argv.slice(2);
	let baseRef: string | null = null;
	let force = false;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (!arg) continue;
		if (arg === "--help" || arg === "-h") usage();
		if (arg === "--force") {
			force = true;
			continue;
		}
		if (arg === "--base") {
			baseRef = args[i + 1] ?? null;
			if (!baseRef) usage();
			i += 1;
			continue;
		}
		usage();
	}

	return { baseRef, force };
};

const resolveBaseRef = (repoRoot: string, preferred?: string | null): string | null => {
	const candidates = preferred ? [preferred] : ["origin/main", "main", "origin/master", "master"];

	for (const candidate of candidates) {
		const res = run(["git", "rev-parse", "--verify", "--quiet", candidate], { cwd: repoRoot });
		if (res.exitCode === 0) return candidate;
	}

	return null;
};

const listChangedFiles = (repoRoot: string, baseRef: string | null): string[] => {
	const files = new Set<string>();

	const staged = run(["git", "diff", "--name-only", "--cached"], { cwd: repoRoot });
	if (staged.exitCode === 0) {
		for (const file of staged.stdout.split(/\r?\n/)) {
			if (file.trim()) files.add(file.trim());
		}
	}

	const unstaged = run(["git", "diff", "--name-only"], { cwd: repoRoot });
	if (unstaged.exitCode === 0) {
		for (const file of unstaged.stdout.split(/\r?\n/)) {
			if (file.trim()) files.add(file.trim());
		}
	}

	if (baseRef) {
		const committed = run(["git", "diff", "--name-only", `${baseRef}...HEAD`], { cwd: repoRoot });
		if (committed.exitCode === 0) {
			for (const file of committed.stdout.split(/\r?\n/)) {
				if (file.trim()) files.add(file.trim());
			}
		}
	}

	return Array.from(files).sort((a, b) => a.localeCompare(b));
};

const isDocOnlyFile = (filePath: string): boolean => {
	const docPrefixes = [
		"conversation/",
		"domain_docs/",
		"agent_docs/",
		"worktree_notes/",
		"user_docs/",
		".claude/",
		".codex/",
		"agent_workflows/",
	];

	if (docPrefixes.some((p) => filePath.startsWith(p))) return true;

	const lower = filePath.toLowerCase();
	return lower.endsWith(".md") || lower.endsWith(".mdx") || lower.endsWith(".txt");
};

const main = async () => {
	const repoRootRes = run(["git", "rev-parse", "--show-toplevel"], { cwd: process.cwd() });
	if (repoRootRes.exitCode !== 0) die(repoRootRes.stderr || "git rev-parse --show-toplevel failed");
	const repoRoot = repoRootRes.stdout.trim();
	if (!repoRoot) die("Unable to determine git toplevel");

	const { baseRef: baseArg, force } = parseArgs(process.argv);
	const baseRef = resolveBaseRef(repoRoot, baseArg);

	const changedFiles = listChangedFiles(repoRoot, baseRef);
	if (changedFiles.length === 0) {
		console.log("smart-verify: no changes detected; skipping lint/check-types.");
		return;
	}

	const docOnly = changedFiles.every(isDocOnlyFile);
	console.log("smart-verify: changed files:");
	for (const file of changedFiles.slice(0, 200)) console.log(`- ${file}`);
	if (changedFiles.length > 200) console.log(`- ... (+${changedFiles.length - 200} more)`);
	console.log("");

	if (docOnly && !force) {
		console.log("smart-verify: doc-only change set; skipping lint/check-types.");
		console.log("smart-verify: use `--force` to run anyway.");
		return;
	}

	console.log(`smart-verify: baseRef=${baseRef ?? "(none)"}; running verification...`);
	const lintExit = await runInherit(["bun", "run", "lint"], { cwd: repoRoot });
	if (lintExit !== 0) process.exit(lintExit);

	const typeExit = await runInherit(["bun", "run", "check-types"], { cwd: repoRoot });
	if (typeExit !== 0) process.exit(typeExit);
};

await main().catch((error) => {
	console.error(error);
	process.exit(1);
});

