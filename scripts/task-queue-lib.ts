import { mkdirSync } from "node:fs";
import path from "node:path";

export type TaskQueueStatus = "pending" | "in_progress" | "completed" | "unknown";

export type TaskQueueSummary = {
	total: number | null;
	pending: number | null;
	inProgress: number | null;
	completed: number | null;
};

export type ParsedTaskQueue = {
	createdAt: string | null;
	source: string | null;
	triageNotePath: string | null;
	statuses: TaskQueueStatus[];
	summary: TaskQueueSummary;
};

export function getRepoRoot(): string {
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

export function ensureScratchDirs(repoRoot: string) {
	const scratchDir = path.join(repoRoot, ".scratch");
	const archiveDir = path.join(scratchDir, "task-queue-archive");
	mkdirSync(scratchDir, { recursive: true });
	mkdirSync(archiveDir, { recursive: true });
	return { scratchDir, archiveDir };
}

export function parseTaskQueue(markdown: string): ParsedTaskQueue {
	const createdAt = markdown.match(/^\s*Created:\s*(.+)\s*$/m)?.[1]?.trim() ?? null;
	const source = markdown.match(/^\s*Source:\s*(.+)\s*$/m)?.[1]?.trim() ?? null;
	const triageNotePath = markdown.match(/^\s*Triage:\s*(.+)\s*$/m)?.[1]?.trim() ?? null;

	const statuses = [...markdown.matchAll(/^\s*-\s+\*\*Status\*\*:\s*(\w+)\s*$/gm)]
		.map((m) => (m?.[1] ?? "").trim())
		.map((value) => {
			if (value === "pending" || value === "in_progress" || value === "completed") return value;
			return "unknown";
		});

	const total = parseInt(markdown.match(/^\s*-\s*Total:\s*(\d+)\s*$/m)?.[1] ?? "", 10);
	const pending = parseInt(markdown.match(/^\s*-\s*pending:\s*(\d+)\s*$/m)?.[1] ?? "", 10);
	const inProgress = parseInt(
		markdown.match(/^\s*-\s*in_progress:\s*(\d+)\s*$/m)?.[1] ?? "",
		10,
	);
	const completed = parseInt(
		markdown.match(/^\s*-\s*completed:\s*(\d+)\s*$/m)?.[1] ?? "",
		10,
	);

	return {
		createdAt,
		source,
		triageNotePath,
		statuses,
		summary: {
			total: Number.isFinite(total) ? total : null,
			pending: Number.isFinite(pending) ? pending : null,
			inProgress: Number.isFinite(inProgress) ? inProgress : null,
			completed: Number.isFinite(completed) ? completed : null,
		},
	};
}

export function isTaskQueueComplete(parsed: ParsedTaskQueue): boolean {
	if (parsed.statuses.length > 0) return parsed.statuses.every((s) => s === "completed");
	const { pending, inProgress } = parsed.summary;
	if (pending === null || inProgress === null) return false;
	return pending === 0 && inProgress === 0;
}

function safeTimestamp(value: string) {
	return value
		.replaceAll(":", "-")
		.replaceAll("/", "-")
		.replaceAll("\\", "-")
		.replaceAll(" ", "_");
}

function uniquePath(candidate: string) {
	const exists = Bun.file(candidate).existsSync();
	if (!exists) return candidate;

	const ext = path.extname(candidate);
	const base = candidate.slice(0, Math.max(0, candidate.length - ext.length));
	for (let i = 1; i <= 999; i += 1) {
		const next = `${base}__${i}${ext}`;
		if (!Bun.file(next).existsSync()) return next;
	}
	return `${base}__${Date.now()}${ext}`;
}

export function buildArchivePath(args: {
	archiveDir: string;
	currentCreatedAt: string | null;
	currentSource: string | null;
	suffix: string;
}) {
	const baseTs = safeTimestamp(args.currentCreatedAt ?? new Date().toISOString());
	const source = (args.currentSource ?? "unknown").replaceAll(/[^\w.-]+/g, "-").slice(0, 60);
	const candidate = path.join(args.archiveDir, `${baseTs}__${source}__${args.suffix}.md`);
	return uniquePath(candidate);
}

export function injectTriageLine(queueMarkdown: string, triageNotePath: string): string {
	if (queueMarkdown.match(/^\s*Triage:\s*.+\s*$/m)) return queueMarkdown;
	const lines = queueMarkdown.split("\n");
	const idx = lines.findIndex((line) => line.trimStart().startsWith("Source:"));
	if (idx === -1) return queueMarkdown;
	lines.splice(idx + 1, 0, `Triage: ${triageNotePath}`);
	return lines.join("\n");
}

