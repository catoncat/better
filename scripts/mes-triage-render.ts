import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type TaskStatus = "pending" | "in_progress" | "done";

type TaskItem = {
	taskId: string;
	title: string;
	status: TaskStatus;
	trackKey: string | null;
	trackTitle: string | null;
	touchPoints: string[];
	lineNo: number;
};

type TrackBucket = {
	key: string;
	title: string;
	p: "P0" | "P1" | "unknown";
	tasks: TaskItem[];
};

const usage = (): never => {
	console.error("Usage: bun scripts/mes-triage-render.ts --plan <path> [--max <n>]");
	process.exit(1);
};

const readTextIfExists = (filePath: string): string | null => {
	if (!existsSync(filePath)) return null;
	return readFileSync(filePath, "utf8");
};

const parseArgs = (argv: string[]) => {
	const args = argv.slice(2);
	let planPath: string | null = null;
	let maxRaw: string | null = null;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") usage();
		if (arg === "--plan") {
			planPath = args[i + 1] ?? null;
			i += 1;
			continue;
		}
		if (arg === "--max") {
			maxRaw = args[i + 1] ?? null;
			i += 1;
			continue;
		}
		usage();
	}

	if (!planPath) usage();
	const max = maxRaw ? Number.parseInt(maxRaw, 10) : 5;
	if (!Number.isFinite(max) || max <= 0) {
		console.error(`Invalid --max: ${maxRaw}`);
		process.exit(1);
	}

	return { planPath, max };
};

const inferAreas = (touchPoints: string[]) => {
	const areas = new Set<string>();
	for (const tp of touchPoints) {
		if (tp.startsWith("packages/db/prisma/")) areas.add("db.prisma");
		else if (tp.startsWith("packages/db/")) areas.add("db");
		else if (tp.startsWith("apps/server/")) areas.add("server");
		else if (tp.startsWith("apps/web/")) areas.add("web");
		else if (tp.startsWith("domain_docs/")) areas.add("domain_docs");
		else if (tp.startsWith("agent_docs/")) areas.add("agent_docs");
		else if (tp.startsWith("scripts/")) areas.add("scripts");
		else areas.add("other");

		if (tp === "packages/db/prisma/schema/schema.prisma") areas.add("db.schema");
		if (tp.includes("/modules/mes/execution/")) areas.add("mes.execution");
		if (tp.includes("/modules/mes/routing/")) areas.add("mes.routing");
	}
	return Array.from(areas).sort((a, b) => a.localeCompare(b));
};

const parsePhase3Tasks = (planPath: string): { tracks: Map<string, TrackBucket>; tasks: TaskItem[] } => {
	const content = readFileSync(planPath, "utf8");
	const lines = content.split(/\r?\n/);

	let currentTrackKey: string | null = null;
	let currentTrackTitle: string | null = null;
	let currentTrackP: TrackBucket["p"] = "unknown";

	const tracks = new Map<string, TrackBucket>();
	const tasks: TaskItem[] = [];

	const ensureTrack = () => {
		if (!currentTrackKey || !currentTrackTitle) return;
		if (!tracks.has(currentTrackKey)) {
			tracks.set(currentTrackKey, {
				key: currentTrackKey,
				title: currentTrackTitle,
				p: currentTrackP,
				tasks: [],
			});
		}
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";

		const trackMatch = line.match(/^###\s+(\d+\.\d+)\s+Track\s+([A-Z])\s+—\s+(.+)\s*$/);
		if (trackMatch) {
			const key = trackMatch[2]!;
			const title = trackMatch[3]!.trim();
			currentTrackKey = key;
			currentTrackTitle = title;
			currentTrackP = title.includes("（P0") ? "P0" : title.includes("（P1") ? "P1" : "unknown";
			ensureTrack();
			continue;
		}

		const taskMatch = line.match(/^- \[([ x~])\]\s+(\d+\.\d+\.\d+)\s+(.+)\s*$/);
		if (!taskMatch) continue;

		const rawStatus = taskMatch[1]!;
		const status: TaskStatus = rawStatus === "x" ? "done" : rawStatus === "~" ? "in_progress" : "pending";
		const taskId = taskMatch[2]!;
		const title = taskMatch[3]!.trim();

		const touchPoints: string[] = [];
		for (let j = index + 1; j < lines.length; j += 1) {
			const next = lines[j] ?? "";
			if (next.startsWith("### ")) break;
			if (next.startsWith("- [")) break;
			if (next.match(/^- \[[ x~]\]\s+\d+\.\d+\.\d+\s+/)) break;

			if (next.includes("Touch points")) {
				for (const match of next.matchAll(/`([^`]+)`/g)) {
					const tp = match[1]?.trim();
					if (tp) touchPoints.push(tp);
				}

				const fallback = next
					.split(":")
					.slice(1)
					.join(":")
					.split(/[、,]/)
					.map((s) => s.trim())
					.filter((s) => s.includes("/") && !s.startsWith("http"));
				for (const tp of fallback) touchPoints.push(tp);
			}
		}

		const item: TaskItem = {
			taskId,
			title,
			status,
			trackKey: currentTrackKey,
			trackTitle: currentTrackTitle,
			touchPoints: Array.from(new Set(touchPoints)).sort((a, b) => a.localeCompare(b)),
			lineNo: index + 1,
		};
		tasks.push(item);
		if (currentTrackKey && tracks.has(currentTrackKey)) tracks.get(currentTrackKey)!.tasks.push(item);
	}

	return { tracks, tasks };
};

const scoreTask = (task: TaskItem, trackP: TrackBucket["p"]) => {
	let score = 0;
	if (trackP === "P0") score += 100;
	if (task.status === "in_progress") score += 30;
	if (task.status === "pending") score += 10;

	const areas = inferAreas(task.touchPoints);
	if (areas.includes("mes.routing")) score += 15;
	if (areas.includes("mes.execution")) score += 15;
	if (areas.includes("web")) score += 10;
	if (areas.includes("server")) score += 8;

	return score;
};

const pickCandidates = (tracks: Map<string, TrackBucket>, max: number): TaskItem[] => {
	const all: Array<{ task: TaskItem; score: number }> = [];
	for (const track of tracks.values()) {
		for (const task of track.tasks) {
			if (task.status === "done") continue;
			all.push({ task, score: scoreTask(task, track.p) });
		}
	}

	all.sort((a, b) => b.score - a.score || a.task.lineNo - b.task.lineNo);

	const picked: TaskItem[] = [];
	const perTrack = new Map<string, number>();
	for (const { task } of all) {
		if (picked.length >= max) break;
		const key = task.trackKey ?? "unknown";
		const count = perTrack.get(key) ?? 0;
		if (count >= 2) continue;
		perTrack.set(key, count + 1);
		picked.push(task);
	}

	if (picked.length === 0) {
		console.log("- No pending tasks found in the plan.");
	}

	return picked;
};

const render = (params: {
	repoRoot: string;
	planPath: string;
	max: number;
	worktreeScan: string | null;
	gitStatus: string | null;
}): string => {
	const { tracks, tasks } = parsePhase3Tasks(params.planPath);
	const candidates = pickCandidates(tracks, params.max);

	const trackByKey = (key: string | null) =>
		key && tracks.has(key) ? tracks.get(key)! : null;

	const usedTracks = new Set(candidates.map((c) => c.trackKey ?? "unknown"));
	const lines: string[] = [];

	lines.push(`MES triage (deterministic)`);
	lines.push("");
	lines.push(`Plan: \`${path.relative(params.repoRoot, params.planPath)}\``);
	lines.push("");

	if (params.gitStatus) {
		lines.push("Git Status:");
		lines.push("```");
		lines.push(params.gitStatus.trimEnd());
		lines.push("```");
		lines.push("");
	}

	if (params.worktreeScan) {
		lines.push("Worktree Scan:");
		lines.push("```");
		lines.push(params.worktreeScan.trimEnd());
		lines.push("```");
		lines.push("");
	}

	let trackIndex = 0;
	for (const key of Array.from(usedTracks)) {
		const track = trackByKey(key === "unknown" ? null : key);
		trackIndex += 1;
		const header = track
			? `- Track ${track.key}: ${track.title}`
			: `- Track ${trackIndex}: (untracked section)`;

		lines.push(header);
		lines.push("  - Candidates:");
		for (const c of candidates.filter((t) => (t.trackKey ?? "unknown") === key)) {
			const dependsOn =
				c.taskId === "3.5.3"
					? "depends on 3.5.2 (or a selector backed by 3.5.1 API)"
					: c.taskId === "3.5.4"
						? "depends on 3.5.3 binding + server validation"
						: c.taskId === "3.5.5"
							? "depends on 3.5.2/3.5.4 UX entrypoints"
							: "depends on plan ordering";

			const touch =
				c.touchPoints.length > 0 ? c.touchPoints.slice(0, 4).map((p) => `\`${p}\``).join(", ") : "(not specified)";

			lines.push(
				`    - \`${c.taskId}\` ${c.title}: why now P0/M3 backlog; ${dependsOn}; touch points ${touch}`,
			);
		}
	}

	lines.push("- Conflicts:");
	const byTrackKey = new Map<string, { track: TrackBucket | null; areas: Set<string> }>();
	for (const c of candidates) {
		const key = c.trackKey ?? "unknown";
		const track = trackByKey(key === "unknown" ? null : key);
		if (!byTrackKey.has(key)) byTrackKey.set(key, { track, areas: new Set<string>() });
		const bucket = byTrackKey.get(key)!;
		for (const area of inferAreas(c.touchPoints)) bucket.areas.add(area);
	}

	const keys = Array.from(byTrackKey.keys());
	const highConflict = new Set(["db.schema", "db.prisma", "mes.routing", "mes.execution", "web", "server"]);
	let anyConflict = false;
	for (let a = 0; a < keys.length; a += 1) {
		for (let b = a + 1; b < keys.length; b += 1) {
			const ak = keys[a]!;
			const bk = keys[b]!;
			const aAreas = byTrackKey.get(ak)!.areas;
			const bAreas = byTrackKey.get(bk)!.areas;
			const overlap = Array.from(aAreas).filter((x) => bAreas.has(x) && highConflict.has(x));
			if (overlap.length === 0) continue;

			anyConflict = true;
			lines.push(
				`  - Track ${ak} blocks Track ${bk}: shared touch points ${overlap.map((x) => `\`${x}\``).join(", ")}`,
			);
		}
	}
	if (!anyConflict) lines.push("  - (none detected from plan touch points)");

	lines.push("");
	lines.push("Pick one; I will confirm scope and start plan-first implementation.");
	lines.push("");
	lines.push("Context:");
	lines.push(`- Total tasks parsed: ${tasks.length}`);

	return lines.join("\n");
};

const main = () => {
	const repoRoot = process.cwd();
	const args = parseArgs(process.argv);
	const planAbs = path.resolve(repoRoot, args.planPath);

	const outputsDir = process.env.WORKFLOW_OUTPUTS_DIR
		? path.resolve(repoRoot, process.env.WORKFLOW_OUTPUTS_DIR)
		: null;

	const worktreeScan = outputsDir ? readTextIfExists(path.join(outputsDir, "worktree_scan.md")) : null;
	const gitStatus = outputsDir ? readTextIfExists(path.join(outputsDir, "git_status.md")) : null;

	console.log(
		render({
			repoRoot,
			planPath: planAbs,
			max: args.max,
			worktreeScan,
			gitStatus,
		}),
	);
};

main();

