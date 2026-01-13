import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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
			"  bun scripts/worktree-note-status.ts [options]",
			"",
			"Options:",
			"  --note <path>   Explicit note path (default: worktree_notes/<branchSlug>.md)",
			"  --base <ref>    Base ref for committed diff (default: auto-detect)",
			"  --help, -h      Show help",
			"",
			"Behavior:",
			"- Updates ONLY the AUTO status block in the worktree note.",
			"- Collects changed files from: staged + unstaged + committed (<base>...HEAD).",
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

const parseArgs = (argv: string[]) => {
	const args = argv.slice(2);
	let notePath: string | null = null;
	let baseRef: string | null = null;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (!arg) continue;
		if (arg === "--help" || arg === "-h") usage();
		if (arg === "--note") {
			notePath = args[i + 1] ?? null;
			if (!notePath) usage();
			i += 1;
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

	return { notePath, baseRef };
};

const branchSlug = (branch: string): string => {
	return branch
		.trim()
		.replaceAll("/", "__")
		.replaceAll(/[^A-Za-z0-9._-]+/g, "_")
		.replaceAll(/_+/g, "_")
		.replaceAll(/^_+|_+$/g, "")
		.slice(0, 120);
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

const isDirty = (repoRoot: string): boolean => {
	const res = run(["git", "status", "--porcelain"], { cwd: repoRoot });
	if (res.exitCode !== 0) return false;
	return res.stdout.trim().length > 0;
};

const commitsAhead = (repoRoot: string, baseRef: string | null): number | null => {
	if (!baseRef) return null;
	const res = run(["git", "rev-list", "--left-right", "--count", `${baseRef}...HEAD`], { cwd: repoRoot });
	if (res.exitCode !== 0) return null;
	const parts = res.stdout.trim().split(/\s+/);
	if (parts.length < 2) return null;
	const ahead = Number.parseInt(parts[1] ?? "", 10);
	return Number.isFinite(ahead) ? ahead : null;
};

const ensureAutoBlock = (text: string): string => {
	if (text.includes("<!-- AUTO:BEGIN status -->") && text.includes("<!-- AUTO:END status -->")) return text;
	return [
		text.trimEnd(),
		"",
		"<!-- AUTO:BEGIN status -->",
		"## Status (auto)",
		"- UpdatedAt: (fill)",
		"- BaseRef: (fill)",
		"- CommitsAheadOfBase: (fill)",
		"- Dirty: (fill)",
		"- ChangedFiles:",
		"  - (fill)",
		"- Next:",
		"  - (fill)",
		"<!-- AUTO:END status -->",
		"",
	].join("\n");
};

const replaceAutoStatusBlock = (text: string, statusLines: string[]): string => {
	const begin = "<!-- AUTO:BEGIN status -->";
	const end = "<!-- AUTO:END status -->";
	const start = text.indexOf(begin);
	const stop = text.indexOf(end);
	if (start === -1 || stop === -1 || stop < start) return ensureAutoBlock(text);

	const head = text.slice(0, start + begin.length);
	const tail = text.slice(stop);
	return [head, "", ...statusLines, tail].join("\n");
};

const SKIP_BRANCHES = ["main", "master"];

const main = () => {
	const repoRootRes = run(["git", "rev-parse", "--show-toplevel"], { cwd: process.cwd() });
	if (repoRootRes.exitCode !== 0) die(repoRootRes.stderr || "git rev-parse --show-toplevel failed");
	const repoRoot = repoRootRes.stdout.trim();
	if (!repoRoot) die("Unable to determine git toplevel");

	const branchRes = run(["git", "branch", "--show-current"], { cwd: repoRoot });
	if (branchRes.exitCode !== 0) die(branchRes.stderr || "git branch --show-current failed");
	const branch = branchRes.stdout.trim();
	if (!branch) die("Not on a branch (detached HEAD); pass --note explicitly.");

	const { notePath: noteArg, baseRef: baseArg } = parseArgs(process.argv);

	// Skip main/master branches - they don't need worktree notes
	if (!noteArg && SKIP_BRANCHES.includes(branch)) {
		console.log(`Skipped: ${branch} is a base branch, no worktree note needed.`);
		return;
	}
	const baseRef = resolveBaseRef(repoRoot, baseArg);

	const slug = branchSlug(branch);
	const notePath = noteArg ? path.resolve(repoRoot, noteArg) : path.join(repoRoot, "worktree_notes", `${slug}.md`);
	mkdirSync(path.dirname(notePath), { recursive: true });

	if (!existsSync(notePath)) {
		const template = [
			"---",
			"type: worktree_note",
			`createdAt: ${JSON.stringify(new Date().toISOString())}`,
			`branch: ${JSON.stringify(branch)}`,
			...(baseRef ? [`baseRef: ${JSON.stringify(baseRef)}`] : []),
			"---",
			"",
			`# ${branch}`,
			"",
			"## Scope",
			"- Goal:",
			"- Non-goals:",
			"- Risks:",
			"",
			"## Slices",
			"- [ ] Slice 0: worktree note context",
			"",
			"<!-- AUTO:BEGIN status -->",
			"## Status (auto)",
			"- UpdatedAt: (pending)",
			"- BaseRef: (pending)",
			"- CommitsAheadOfBase: (pending)",
			"- Dirty: (pending)",
			"- ChangedFiles:",
			"  - (pending)",
			"- Next:",
			"  - (pending)",
			"<!-- AUTO:END status -->",
			"",
			"## Decisions",
			"-",
			"",
			"## Open Questions",
			"-",
			"",
		].join("\n");

		writeFileSync(notePath, template, "utf8");
	}

	const changedFiles = listChangedFiles(repoRoot, baseRef);
	const dirty = isDirty(repoRoot);
	const ahead = commitsAhead(repoRoot, baseRef);
	const updatedAt = new Date().toISOString();

	const noteRel = path.relative(repoRoot, notePath).replaceAll(path.sep, "/");
	const shouldCommitNote = changedFiles.includes(noteRel) || changedFiles.some((f) => f.startsWith("worktree_notes/"));

	const statusLines: string[] = [];
	statusLines.push("## Status (auto)");
	statusLines.push(`- UpdatedAt: ${updatedAt}`);
	statusLines.push(`- BaseRef: ${baseRef ?? "(none)"}`);
	statusLines.push(`- CommitsAheadOfBase: ${ahead ?? "(unknown)"}`);
	statusLines.push(`- Dirty: ${dirty}`);
	statusLines.push("- ChangedFiles:");
	if (changedFiles.length === 0) statusLines.push("  - (none)");
	else statusLines.push(...changedFiles.slice(0, 50).map((f) => `  - ${f}`));
	if (changedFiles.length > 50) statusLines.push(`  - ... (+${changedFiles.length - 50} more)`);
	statusLines.push("- Next:");
	if (shouldCommitNote) {
		statusLines.push(`  - Commit worktree note: git add ${noteRel} && git commit -m "docs(worktree): add task context"`);
	} else {
		statusLines.push("  - Continue the next unchecked slice.");
	}

	const original = readFileSync(notePath, "utf8");
	const ensured = ensureAutoBlock(original);
	const updated = replaceAutoStatusBlock(ensured, statusLines);
	writeFileSync(notePath, updated, "utf8");

	console.log(`Updated: ${noteRel}`);
};

main();

