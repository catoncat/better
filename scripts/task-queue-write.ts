/**
 * Safely write `.scratch/task-queue.md` while preserving local history.
 *
 * Behavior:
 * - If an existing queue exists and is fully completed: archive it, then overwrite.
 * - If an existing queue exists and is NOT completed: refuse overwrite unless `--force`.
 * - If `--force` is used: archive existing queue as `superseded_incomplete`, then overwrite.
 *
 * Usage:
 *   bun scripts/task-queue-write.ts --input <path> [--triage <path>] [--force]
 *   bun scripts/task-queue-write.ts --stdin [--triage <path>] [--force]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	buildArchivePath,
	ensureScratchDirs,
	getRepoRoot,
	injectTriageLine,
	isTaskQueueComplete,
	parseTaskQueue,
} from "./task-queue-lib";

type Args = {
	inputPath: string | null;
	stdin: boolean;
	force: boolean;
	triageNotePath: string | null;
};

function usage(): never {
	console.error(
		[
			"Usage:",
			"  bun scripts/task-queue-write.ts --input <path> [--triage <path>] [--force]",
			"  bun scripts/task-queue-write.ts --stdin [--triage <path>] [--force]",
			"",
			"Options:",
			"  --input <path>   Read task queue markdown from file",
			"  --stdin         Read task queue markdown from stdin",
			"  --triage <path> Triage note path to embed as `Triage:` line",
			"  --force         Overwrite even if existing queue is incomplete",
			"",
			"Output:",
			"  Writes `.scratch/task-queue.md` and archives previous queues to",
			"  `.scratch/task-queue-archive/`.",
		].join("\n"),
	);
	process.exit(1);
}

function parseArgs(argv: string[]): Args {
	const args = argv.slice(2);
	if (args.includes("--help") || args.includes("-h")) usage();

	let inputPath: string | null = null;
	let stdin = false;
	let force = false;
	let triageNotePath: string | null = null;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (!arg) continue;

		const takeValue = (): string => {
			const value = args[i + 1];
			if (!value) usage();
			i += 1;
			return value;
		};

		if (arg === "--input") {
			inputPath = takeValue();
			continue;
		}
		if (arg === "--stdin") {
			stdin = true;
			continue;
		}
		if (arg === "--triage") {
			triageNotePath = takeValue();
			continue;
		}
		if (arg === "--force") {
			force = true;
			continue;
		}

		console.error(`Unknown argument: ${arg}`);
		usage();
	}

	if (!stdin && !inputPath) {
		console.error("Must provide either --input or --stdin.");
		usage();
	}
	if (stdin && inputPath) {
		console.error("Provide only one of --input or --stdin.");
		usage();
	}

	return { inputPath, stdin, force, triageNotePath };
}

async function readIncomingQueue(args: Args): Promise<string> {
	if (args.inputPath) return readFileSync(args.inputPath, "utf8");
	return await new Response(Bun.stdin).text();
}

const args = parseArgs(process.argv);
const repoRoot = getRepoRoot();
const { scratchDir, archiveDir } = ensureScratchDirs(repoRoot);

const queuePath = path.join(scratchDir, "task-queue.md");
const incomingRaw = await readIncomingQueue(args);
const incoming = args.triageNotePath
	? injectTriageLine(incomingRaw, args.triageNotePath)
	: incomingRaw;

if (!incoming.trim()) {
	console.error("Incoming task queue markdown is empty.");
	process.exit(1);
}

if (existsSync(queuePath)) {
	const current = readFileSync(queuePath, "utf8");
	const parsed = parseTaskQueue(current);
	const complete = isTaskQueueComplete(parsed);
	const suffix = complete ? "completed" : "superseded_incomplete";

	if (!complete && !args.force) {
		console.error("Refusing to overwrite existing `.scratch/task-queue.md` because it is not completed.");
		console.error("Finish or archive the current queue first, or re-run with `--force`.");
		process.exit(2);
	}

	const archivePath = buildArchivePath({
		archiveDir,
		currentCreatedAt: parsed.createdAt,
		currentSource: parsed.source,
		suffix,
	});
	writeFileSync(archivePath, current, "utf8");
	console.log(`Archived previous task queue to: ${path.relative(repoRoot, archivePath)}`);
}

writeFileSync(queuePath, incoming, "utf8");
console.log(`Wrote task queue to: ${path.relative(repoRoot, queuePath)}`);

