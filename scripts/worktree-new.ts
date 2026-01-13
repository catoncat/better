import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type WorktreeInfo = {
  worktreePath: string;
  branch?: string;
};

type ParsedArgs = {
  branch: string;
  targetPathArg: string;
  task?: string;
  planPath?: string;
  planItem?: string;
  triageNotePath?: string;
  touchPoints: string[];
  slices: string[];
  baseRef?: string;
  noNote: boolean;
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
      "  bun scripts/worktree-new.ts <branch> <path> [options]",
      "",
      "Behavior:",
      "- Creates a git worktree at <path> on <branch>.",
      "- Runs `bun install` in the new worktree.",
      "- Copies `apps/server/.env` from the current worktree (if present).",
      "- Rewrites `DATABASE_URL` in the new worktree to use an absolute path to the canonical main worktree's `data/`.",
      "- Optionally creates/updates `worktree_notes/<branchSlug>.md` in the new worktree.",
      "",
      "Options:",
      "  --task <text>           Task title/summary",
      "  --plan <path>           Plan file path (repo-relative)",
      "  --plan-item <id>        Plan item identifier (e.g. 3.2)",
      "  --triage <path>         Related triage note path (repo-relative)",
      "  --touch <path>          Touch point (repeatable)",
      "  --slice <text>          Slice line (repeatable)",
      "  --base <ref>            Base ref for status (default: auto-detect)",
      "  --no-note               Do not create/update a worktree note",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const branch = args[0];
  const targetPathArg = args[1];
  if (!branch || !targetPathArg) usage();

  const touchPoints: string[] = [];
  const slices: string[] = [];

  let task: string | undefined;
  let planPath: string | undefined;
  let planItem: string | undefined;
  let triageNotePath: string | undefined;
  let baseRef: string | undefined;
  let noNote = false;

  const rest = args.slice(2);
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg) continue;

    const takeValue = (): string => {
      const value = rest[i + 1];
      if (!value) usage();
      i += 1;
      return value;
    };

    if (arg === "--no-note") {
      noNote = true;
      continue;
    }
    if (arg === "--task") {
      task = takeValue();
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
    if (arg === "--slice" || arg === "--slices") {
      slices.push(takeValue());
      continue;
    }
    if (arg === "--base") {
      baseRef = takeValue();
      continue;
    }

    usage();
  }

  return {
    branch,
    targetPathArg,
    task,
    planPath,
    planItem,
    triageNotePath,
    touchPoints,
    slices,
    baseRef,
    noNote,
  };
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

    if (key === "branch") {
      current.branch = value;
      continue;
    }
  }

  flush();
  return worktrees;
}

function findCanonicalMainWorktree(repoRoot: string): string {
  const wtList = run(["git", "worktree", "list", "--porcelain"], { cwd: repoRoot });
  if (wtList.exitCode !== 0) return repoRoot;

  const worktrees = parseWorktreeListPorcelain(wtList.stdout);
  const main = worktrees.find((wt) => wt.branch === "refs/heads/main");
  return main ? path.resolve(main.worktreePath) : repoRoot;
}

function setEnvVar(filePath: string, key: string, value: string): void {
  const original = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = original.length > 0 ? original.split(/\r?\n/) : [];

  const entry = `${key}=${value}`;
  let replaced = false;
  const updated = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) return line;
    if (match[1] !== key) return line;
    replaced = true;
    return entry;
  });

  if (!replaced) {
    if (updated.length > 0 && updated[updated.length - 1]?.trim() !== "") updated.push("");
    updated.push(entry);
  }

  const out = updated.join("\n").replaceAll(/\n{3,}$/g, "\n\n");
  writeFileSync(filePath, out, "utf8");
}

function getSqliteDbFileNameFromEnv(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  if (!match) return null;
  const rawValue = match[1]?.trim();
  if (!rawValue) return null;

  const value = rawValue.replaceAll(/^['"]|['"]$/g, "");
  if (!value.startsWith("file:")) return null;

  const sqlitePath = value.slice("file:".length);
  if (!sqlitePath || sqlitePath.endsWith("/") || sqlitePath.endsWith(path.sep)) return null;
  return path.basename(sqlitePath);
}

function branchSlug(branch: string): string {
  return branch
    .trim()
    .replaceAll("/", "__")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 120);
}

function resolveBaseRef(worktreePath: string, preferred?: string): string | null {
  const candidates = preferred ? [preferred] : ["origin/main", "main", "origin/master", "master"];

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

function isDirty(worktreePath: string): boolean {
  const res = run(["git", "status", "--porcelain"], { cwd: worktreePath });
  if (res.exitCode !== 0) return false;
  return res.stdout.trim().length > 0;
}

function commitsAhead(worktreePath: string, baseRef: string | null): number | null {
  if (!baseRef) return null;
  const res = run(["git", "rev-list", "--left-right", "--count", `${baseRef}...HEAD`], { cwd: worktreePath });
  if (res.exitCode !== 0) return null;

  const parts = res.stdout.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const aheadRaw = parts[1];
  const ahead = aheadRaw ? Number.parseInt(aheadRaw, 10) : Number.NaN;
  return Number.isFinite(ahead) ? ahead : null;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function toYamlList(items: string[], indent: string): string[] {
  return items.map((item) => `${indent}- ${yamlString(item)}`);
}

function ensureAutoBlock(text: string): string {
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
}

function replaceAutoStatusBlock(text: string, statusLines: string[]): string {
  const begin = "<!-- AUTO:BEGIN status -->";
  const end = "<!-- AUTO:END status -->";
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start === -1 || stop === -1 || stop < start) return ensureAutoBlock(text);

  const head = text.slice(0, start + begin.length);
  const tail = text.slice(stop);
  return [head, "", ...statusLines, tail].join("\n");
}

function buildNoteTemplate(params: {
  branch: string;
  baseRef: string | null;
  task?: string;
  planPath?: string;
  planItem?: string;
  triageNotePath?: string;
  touchPoints: string[];
  slices: string[];
}): string {
  const createdAt = new Date().toISOString();

  const yaml: string[] = [];
  yaml.push("---");
  yaml.push("type: worktree_note");
  yaml.push(`createdAt: ${yamlString(createdAt)}`);
  yaml.push(`branch: ${yamlString(params.branch)}`);
  if (params.baseRef) yaml.push(`baseRef: ${yamlString(params.baseRef)}`);

  if (params.task || params.planPath || params.planItem || params.triageNotePath) {
    yaml.push("task:");
    if (params.task) yaml.push(`  title: ${yamlString(params.task)}`);
    if (params.planPath) yaml.push(`  planPath: ${yamlString(params.planPath)}`);
    if (params.planItem) yaml.push(`  planItem: ${yamlString(params.planItem)}`);
    if (params.triageNotePath) yaml.push(`  triageNote: ${yamlString(params.triageNotePath)}`);
  }

  if (params.touchPoints.length > 0) {
    yaml.push("touchPoints:");
    yaml.push(...toYamlList(params.touchPoints, "  "));
  }

  yaml.push("---");

  const title = params.task ? `${params.branch} — ${params.task}` : params.branch;
  const sliceLines =
    params.slices.length > 0
      ? params.slices.map((s) => `- [ ] ${s}`)
      : ["- [ ] Slice 0: worktree note context"];

  const content = [
    ...yaml,
    "",
    `# ${title}`,
    "",
    "## Scope",
    "- Goal:",
    "- Non-goals:",
    "- Risks:",
    "",
    "## Slices",
    ...sliceLines,
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

  return content;
}

function updateNoteStatus(params: { notePath: string; worktreePath: string; baseRef: string | null }): void {
  const updatedAt = new Date().toISOString();
  const changedFiles = listChangedFiles(params.worktreePath, params.baseRef);
  const dirty = isDirty(params.worktreePath);
  const ahead = commitsAhead(params.worktreePath, params.baseRef);

  const noteRel = path.relative(params.worktreePath, params.notePath).replaceAll(path.sep, "/");
  const shouldCommitNote =
    changedFiles.includes(noteRel) || changedFiles.some((f) => f.startsWith("worktree_notes/"));

  const statusLines: string[] = [];
  statusLines.push("## Status (auto)");
  statusLines.push(`- UpdatedAt: ${updatedAt}`);
  statusLines.push(`- BaseRef: ${params.baseRef ?? "(none)"}`);
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

  const original = existsSync(params.notePath) ? readFileSync(params.notePath, "utf8") : "";
  const ensured = ensureAutoBlock(original);
  const updated = replaceAutoStatusBlock(ensured, statusLines);
  writeFileSync(params.notePath, updated, "utf8");
}

function ensureWorktreeNote(params: {
  worktreePath: string;
  branch: string;
  baseRef: string | null;
  task?: string;
  planPath?: string;
  planItem?: string;
  triageNotePath?: string;
  touchPoints: string[];
  slices: string[];
}): { noteRel: string; created: boolean } {
  const dir = path.join(params.worktreePath, "worktree_notes");
  mkdirSync(dir, { recursive: true });

  const slug = branchSlug(params.branch);
  const notePath = path.join(dir, `${slug}.md`);
  const noteRel = `worktree_notes/${slug}.md`;

  let created = false;
  if (!existsSync(notePath)) {
    const template = buildNoteTemplate({
      branch: params.branch,
      baseRef: params.baseRef,
      task: params.task,
      planPath: params.planPath,
      planItem: params.planItem,
      triageNotePath: params.triageNotePath,
      touchPoints: params.touchPoints,
      slices: params.slices,
    });
    writeFileSync(notePath, template, "utf8");
    created = true;
  }

  updateNoteStatus({ notePath, worktreePath: params.worktreePath, baseRef: params.baseRef });
  return { noteRel, created };
}

const parsed = parseArgs(process.argv);
const branch = parsed.branch;
const targetPathArg = parsed.targetPathArg;

const repoRootResult = run(["git", "rev-parse", "--show-toplevel"]);
if (repoRootResult.exitCode !== 0) die(repoRootResult.stderr || "git rev-parse failed");
const mainRoot = repoRootResult.stdout.trim();
if (!mainRoot) die("Unable to determine git toplevel");

const targetPath = path.resolve(process.cwd(), targetPathArg);

const canonicalRoot = findCanonicalMainWorktree(mainRoot);
const canonicalDataDir = path.join(canonicalRoot, "data");
mkdirSync(canonicalDataDir, { recursive: true });

const branchExistsResult = run(
  ["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
  { cwd: mainRoot },
);
const branchExists = branchExistsResult.exitCode === 0;

const addArgs = branchExists
  ? ["git", "worktree", "add", targetPath, branch]
  : ["git", "worktree", "add", "-b", branch, targetPath];
const addResult = run(addArgs, { cwd: mainRoot });
if (addResult.exitCode !== 0) die(addResult.stderr || addResult.stdout || "git worktree add failed");

const installResult = run(["bun", "install"], { cwd: targetPath });
if (installResult.exitCode !== 0)
  die(installResult.stderr || installResult.stdout || "bun install failed");

const srcEnv = path.join(mainRoot, "apps", "server", ".env");
const dstEnv = path.join(targetPath, "apps", "server", ".env");
if (existsSync(srcEnv) && !existsSync(dstEnv)) {
  copyFileSync(srcEnv, dstEnv);
}

if (existsSync(dstEnv)) {
  const dbFileName = getSqliteDbFileNameFromEnv(srcEnv) ?? "db.db";
  const dbUrl = `file:${path.join(canonicalDataDir, dbFileName)}`;
  setEnvVar(dstEnv, "DATABASE_URL", dbUrl);
}

let noteLine = "";
let noteNext = "";
if (!parsed.noNote) {
  const baseRef = resolveBaseRef(targetPath, parsed.baseRef);
  const note = ensureWorktreeNote({
    worktreePath: targetPath,
    branch,
    baseRef,
    task: parsed.task,
    planPath: parsed.planPath,
    planItem: parsed.planItem,
    triageNotePath: parsed.triageNotePath,
    touchPoints: parsed.touchPoints,
    slices: parsed.slices,
  });
  noteLine = `- note:   ${note.noteRel}${note.created ? " (created)" : ""}`;
  if (note.created) noteNext = `- git add ${note.noteRel} && git commit -m "docs(worktree): add task context"`;
}

console.log(
  [
    "Worktree ready:",
    `- main:   ${mainRoot}`,
    `- db:     file:${path.join(canonicalDataDir, getSqliteDbFileNameFromEnv(srcEnv) ?? "db.db")}`,
    `- branch: ${branch}`,
    `- path:   ${targetPath}`,
    ...(noteLine ? [noteLine] : []),
    "",
    "Next:",
    `- cd ${targetPath}`,
    "- bun run dev (or dev:web / dev:server)",
    ...(noteNext ? [noteNext] : []),
  ].join("\n"),
);
