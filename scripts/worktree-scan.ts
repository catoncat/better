import { existsSync } from "node:fs";
import path from "node:path";

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type WorktreeInfo = {
  worktreePath: string;
  head?: string;
  branch?: string;
  detached?: boolean;
};

type WorktreeStatus = WorktreeInfo & {
  exists: boolean;
  isCurrent: boolean;
  dirty: boolean;
  ahead: number | null;
  behind: number | null;
  baseRef: string | null;
  touchedAreas: string[];
  changedFiles: string[];
  lastCommitSubject: string | null;
};

function run(cmd: string[], options?: { cwd?: string }): RunResult {
  const proc = Bun.spawnSync(cmd, {
    cwd: options?.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    stdout: new TextDecoder().decode(proc.stdout ?? new Uint8Array()),
    stderr: new TextDecoder().decode(proc.stderr ?? new Uint8Array()),
    exitCode: proc.exitCode,
  };
}

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

function usage(): never {
  die(
    [
      "Usage:",
      "  bun scripts/worktree-scan.ts [--base <ref>] [--format md|json]",
      "",
      "Examples:",
      "  bun scripts/worktree-scan.ts",
      "  bun scripts/worktree-scan.ts --base main",
      "  bun scripts/worktree-scan.ts --format json",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { base?: string; format: "md" | "json" } {
  const args = argv.slice(2);
  let base: string | undefined;
  let format: "md" | "json" = "md";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") usage();
    if (arg === "--base") {
      const value = args[i + 1];
      if (!value) usage();
      base = value;
      i += 1;
      continue;
    }
    if (arg === "--format") {
      const value = args[i + 1];
      if (value !== "md" && value !== "json") usage();
      format = value;
      i += 1;
      continue;
    }
    usage();
  }

  return { base, format };
}

function parseWorktreeListPorcelain(output: string): WorktreeInfo[] {
  const lines = output.split(/\r?\n/);
  const worktrees: WorktreeInfo[] = [];

  let current: Partial<WorktreeInfo> | null = null;
  const flush = () => {
    if (current?.worktreePath) worktrees.push(current as WorktreeInfo);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }

    const spaceIndex = trimmed.indexOf(" ");
    const key = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const value = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    if (key === "worktree") {
      flush();
      current = { worktreePath: value };
      continue;
    }

    if (!current) continue;

    if (key === "HEAD") {
      current.head = value;
      continue;
    }

    if (key === "branch") {
      current.branch = value.replace(/^refs\/heads\//, "");
      continue;
    }

    if (key === "detached") {
      current.detached = true;
      continue;
    }
  }

  flush();
  return worktrees;
}

function findRepoRoot(cwd: string): string {
  const result = run(["git", "rev-parse", "--show-toplevel"], { cwd });
  if (result.exitCode !== 0) die(result.stderr || "git rev-parse --show-toplevel failed");
  return result.stdout.trim();
}

function resolveBaseRef(worktreePath: string, preferred?: string): string | null {
  const candidates = preferred
    ? [preferred]
    : ["main", "master", "origin/main", "origin/master"];

  for (const candidate of candidates) {
    const res = run(["git", "rev-parse", "--verify", "--quiet", candidate], { cwd: worktreePath });
    if (res.exitCode === 0) return candidate;
  }

  return null;
}

function listChangedFiles(worktreePath: string, baseRef: string | null): string[] {
  const files = new Set<string>();

  const staged = run(["git", "diff", "--name-only", "--cached"], { cwd: worktreePath });
  if (staged.exitCode === 0) {
    for (const file of staged.stdout.split(/\r?\n/)) {
      if (file.trim()) files.add(file.trim());
    }
  }

  const unstaged = run(["git", "diff", "--name-only"], { cwd: worktreePath });
  if (unstaged.exitCode === 0) {
    for (const file of unstaged.stdout.split(/\r?\n/)) {
      if (file.trim()) files.add(file.trim());
    }
  }

  if (baseRef) {
    const committed = run(["git", "diff", "--name-only", `${baseRef}...HEAD`], { cwd: worktreePath });
    if (committed.exitCode === 0) {
      for (const file of committed.stdout.split(/\r?\n/)) {
        if (file.trim()) files.add(file.trim());
      }
    }
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

function inferTouchedAreas(files: string[]): string[] {
  const areas = new Set<string>();

  for (const file of files) {
    if (file.startsWith("packages/db/prisma/")) areas.add("db.prisma");
    else if (file.startsWith("packages/db/")) areas.add("db");
    else if (file.startsWith("apps/server/")) areas.add("server");
    else if (file.startsWith("apps/web/")) areas.add("web");
    else if (file.startsWith("worktree_notes/")) areas.add("worktree_notes");
    else if (file.startsWith("domain_docs/")) areas.add("domain_docs");
    else if (file.startsWith("agent_docs/")) areas.add("agent_docs");
    else if (file.startsWith("scripts/")) areas.add("scripts");
    else if (file.startsWith("ops/")) areas.add("ops");
    else areas.add("other");

    if (file === "packages/db/prisma/schema/schema.prisma") areas.add("db.schema");
    if (file.includes("/modules/mes/execution/")) areas.add("mes.execution");
    if (file.includes("/modules/mes/routing/")) areas.add("mes.routing");
  }

  return Array.from(areas).sort((a, b) => a.localeCompare(b));
}

function isDirty(worktreePath: string): boolean {
  const res = run(["git", "status", "--porcelain"], { cwd: worktreePath });
  if (res.exitCode !== 0) return false;
  return res.stdout.trim().length > 0;
}

function aheadBehind(worktreePath: string, baseRef: string | null): { ahead: number | null; behind: number | null } {
  if (!baseRef) return { ahead: null, behind: null };
  const res = run(["git", "rev-list", "--left-right", "--count", `${baseRef}...HEAD`], {
    cwd: worktreePath,
  });
  if (res.exitCode !== 0) return { ahead: null, behind: null };

  const [behindRaw, aheadRaw] = res.stdout.trim().split(/\s+/);
  const behind = behindRaw ? Number.parseInt(behindRaw, 10) : Number.NaN;
  const ahead = aheadRaw ? Number.parseInt(aheadRaw, 10) : Number.NaN;
  return {
    ahead: Number.isFinite(ahead) ? ahead : null,
    behind: Number.isFinite(behind) ? behind : null,
  };
}

function lastCommitSubject(worktreePath: string): string | null {
  const res = run(["git", "log", "-1", "--pretty=%s"], { cwd: worktreePath });
  if (res.exitCode !== 0) return null;
  const subject = res.stdout.trim();
  return subject.length > 0 ? subject : null;
}

function toMarkdown(statuses: WorktreeStatus[]): string {
  const current = statuses.find((s) => s.isCurrent);
  const inflight = statuses.filter((s) => s.exists && !s.isCurrent && (s.dirty || (s.ahead ?? 0) > 0));

  const lines: string[] = [];
  lines.push("# Worktree Scan");
  lines.push("");
  if (current) {
    const ref = current.detached ? `detached@${current.head?.slice(0, 7) ?? "unknown"}` : current.branch ?? "unknown";
    lines.push(`Current: ${current.worktreePath} (${ref})`);
    lines.push("");
  }

  if (inflight.length === 0) {
    lines.push("In-flight worktrees: none");
    return lines.join("\n");
  }

  lines.push("In-flight worktrees:");
  for (const wt of inflight) {
    const ref = wt.detached ? `detached@${wt.head?.slice(0, 7) ?? "unknown"}` : wt.branch ?? "unknown";
    const stateParts: string[] = [];
    if (wt.dirty) stateParts.push("dirty");
    if (wt.ahead !== null && wt.ahead > 0) stateParts.push(`ahead ${wt.ahead}`);
    if (wt.behind !== null && wt.behind > 0) stateParts.push(`behind ${wt.behind}`);

    lines.push(`- ${wt.worktreePath} (${ref}) [${stateParts.join(", ") || "clean"}]`);
    if (wt.touchedAreas.length > 0) lines.push(`  - touch: ${wt.touchedAreas.join(", ")}`);
    if (wt.lastCommitSubject) lines.push(`  - last: ${wt.lastCommitSubject}`);
    if (wt.changedFiles.length > 0) {
      const sample = wt.changedFiles.slice(0, 8);
      lines.push(`  - files (${wt.changedFiles.length}): ${sample.join(", ")}${wt.changedFiles.length > sample.length ? ", ..." : ""}`);
    }
  }

  return lines.join("\n");
}

const { base: preferredBase, format } = parseArgs(process.argv);
const repoRoot = findRepoRoot(process.cwd());

const wtList = run(["git", "worktree", "list", "--porcelain"], { cwd: repoRoot });
if (wtList.exitCode !== 0) die(wtList.stderr || "git worktree list failed");

const worktrees = parseWorktreeListPorcelain(wtList.stdout);
const currentRoot = repoRoot;

const statuses: WorktreeStatus[] = worktrees.map((wt) => {
  const worktreePath = path.resolve(wt.worktreePath);
  const exists = existsSync(worktreePath);
  const isCurrent = path.resolve(currentRoot) === worktreePath;

  if (!exists) {
    return {
      ...wt,
      worktreePath,
      exists: false,
      isCurrent,
      dirty: false,
      ahead: null,
      behind: null,
      baseRef: null,
      touchedAreas: [],
      changedFiles: [],
      lastCommitSubject: null,
    };
  }

  const baseRef = resolveBaseRef(worktreePath, preferredBase);
  const changedFiles = listChangedFiles(worktreePath, baseRef);
  const touchedAreas = inferTouchedAreas(changedFiles);
  const dirty = isDirty(worktreePath);
  const { ahead, behind } = aheadBehind(worktreePath, baseRef);
  const last = lastCommitSubject(worktreePath);

  return {
    ...wt,
    worktreePath,
    exists,
    isCurrent,
    dirty,
    ahead,
    behind,
    baseRef,
    touchedAreas,
    changedFiles,
    lastCommitSubject: last,
  };
});

if (format === "json") {
  console.log(JSON.stringify({ repoRoot, statuses }, null, 2));
} else {
  console.log(toMarkdown(statuses));
}
