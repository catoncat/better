/**
 * Archive `.scratch/task-queue.md` into `.scratch/task-queue-archive/`.
 *
 * - If queue is completed: archives as `completed`.
 * - Otherwise: refuses unless `--force`, then archives as `incomplete`.
 *
 * Usage:
 *   bun scripts/task-queue-archive.ts [--force]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	buildArchivePath,
	ensureScratchDirs,
	getRepoRoot,
	isTaskQueueComplete,
	parseTaskQueue,
} from "./task-queue-lib";

function usage(): never {
	console.error(["Usage:", "  bun scripts/task-queue-archive.ts [--force]"].join("\n"));
	process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) usage();

const force = argv.includes("--force");
const repoRoot = getRepoRoot();
const { scratchDir, archiveDir } = ensureScratchDirs(repoRoot);

const queuePath = path.join(scratchDir, "task-queue.md");
if (!existsSync(queuePath)) {
	console.error("No `.scratch/task-queue.md` found.");
	process.exit(2);
}

const current = readFileSync(queuePath, "utf8");
const parsed = parseTaskQueue(current);
const complete = isTaskQueueComplete(parsed);

if (!complete && !force) {
	console.error("Refusing to archive as completed: task queue is not completed.");
	console.error("Re-run with `--force` to archive anyway.");
	process.exit(3);
}

const archivePath = buildArchivePath({
	archiveDir,
	currentCreatedAt: parsed.createdAt,
	currentSource: parsed.source,
	suffix: complete ? "completed" : "incomplete",
});

writeFileSync(archivePath, current, "utf8");
console.log(`Archived task queue to: ${path.relative(repoRoot, archivePath)}`);

