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
      "  bun scripts/worktree-new.ts <branch> <path>",
      "",
      "Behavior:",
      "- Creates a git worktree at <path> on <branch>.",
      "- Runs `bun install` in the new worktree.",
      "- Copies `apps/server/.env` from the current worktree (if present).",
      "- Rewrites `DATABASE_URL` in the new worktree to use an absolute path to the canonical main worktree's `data/`.",
    ].join("\n"),
  );
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

const [branch, targetPathArg] = process.argv.slice(2);
if (!branch || !targetPathArg) usage();

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

console.log(
  [
    "Worktree ready:",
    `- main:   ${mainRoot}`,
    `- db:     file:${path.join(canonicalDataDir, getSqliteDbFileNameFromEnv(srcEnv) ?? "db.db")}`,
    `- branch: ${branch}`,
    `- path:   ${targetPath}`,
    "",
    "Next:",
    `- cd ${targetPath}`,
    "- bun run dev (or dev:web / dev:server)",
  ].join("\n"),
);
