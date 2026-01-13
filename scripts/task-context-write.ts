/**
 * Write task context to .task-context.json for worktree-new to consume.
 *
 * Usage:
 *   bun scripts/task-context-write.ts --task "..." --slice "..." --slice "..." [--plan ...] [--plan-item ...]
 *
 * This file is:
 * - gitignored
 * - consumed and deleted by worktree-new.ts
 * - a temporary bridge between task-split and worktree-new
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

type TaskContext = {
	task?: string;
	slices: string[];
	planPath?: string;
	planItem?: string;
	triageNotePath?: string;
	touchPoints: string[];
	createdAt: string;
};

function usage(): never {
	console.error(
		[
			"Usage:",
			"  bun scripts/task-context-write.ts [options]",
			"",
			"Options:",
			"  --task <text>       Task title/summary",
			"  --slice <text>      Slice description (repeatable)",
			"  --plan <path>       Plan file path (repo-relative)",
			"  --plan-item <id>    Plan item identifier (e.g. 3.2)",
			"  --triage <path>     Related triage note path",
			"  --touch <path>      Touch point (repeatable)",
			"",
			"Output:",
			"  Writes .task-context.json in repo root.",
			"  This file is consumed and deleted by worktree-new.ts.",
		].join("\n"),
	);
	process.exit(1);
}

function parseArgs(argv: string[]): TaskContext {
	const args = argv.slice(2);
	if (args.includes("--help") || args.includes("-h")) usage();

	const slices: string[] = [];
	const touchPoints: string[] = [];
	let task: string | undefined;
	let planPath: string | undefined;
	let planItem: string | undefined;
	let triageNotePath: string | undefined;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (!arg) continue;

		const takeValue = (): string => {
			const value = args[i + 1];
			if (!value) usage();
			i += 1;
			return value;
		};

		if (arg === "--task") {
			task = takeValue();
			continue;
		}
		if (arg === "--slice") {
			slices.push(takeValue());
			continue;
		}
		if (arg === "--plan") {
			planPath = takeValue();
			continue;
		}
		if (arg === "--plan-item") {
			planItem = takeValue();
			continue;
		}
		if (arg === "--triage") {
			triageNotePath = takeValue();
			continue;
		}
		if (arg === "--touch") {
			touchPoints.push(takeValue());
			continue;
		}

		console.error(`Unknown argument: ${arg}`);
		usage();
	}

	if (!task && slices.length === 0) {
		console.error("At least --task or --slice is required.");
		usage();
	}

	return {
		task,
		slices,
		planPath,
		planItem,
		triageNotePath,
		touchPoints,
		createdAt: new Date().toISOString(),
	};
}

function getRepoRoot(): string {
	const proc = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	if (proc.exitCode !== 0) {
		console.error("Failed to determine git repo root");
		process.exit(1);
	}
	return new TextDecoder().decode(proc.stdout).trim();
}

const context = parseArgs(process.argv);
const repoRoot = getRepoRoot();
const contextPath = path.join(repoRoot, ".task-context.json");

writeFileSync(contextPath, JSON.stringify(context, null, 2), "utf8");
console.log(`Task context written to: ${contextPath}`);
console.log("");
console.log("Next: run worktree-new to create a worktree with this context.");
console.log("  bun scripts/worktree-new.ts <branch> <path>");
console.log("");
console.log("The context file will be consumed and deleted automatically.");
