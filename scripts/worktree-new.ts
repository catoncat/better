import { copyFileSync, existsSync, lstatSync, symlinkSync } from "node:fs";
import path from "node:path";

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
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
      "- Symlinks `data` to the current worktree's `data` (if present).",
    ].join("\n"),
  );
}

const [branch, targetPathArg] = process.argv.slice(2);
if (!branch || !targetPathArg) usage();

const repoRootResult = run(["git", "rev-parse", "--show-toplevel"]);
if (repoRootResult.exitCode !== 0) die(repoRootResult.stderr || "git rev-parse failed");
const mainRoot = repoRootResult.stdout.trim();
if (!mainRoot) die("Unable to determine git toplevel");

const targetPath = path.resolve(process.cwd(), targetPathArg);

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

const srcData = path.join(mainRoot, "data");
const dstData = path.join(targetPath, "data");
if (existsSync(srcData)) {
  if (existsSync(dstData)) {
    const stat = lstatSync(dstData);
    if (!stat.isSymbolicLink()) {
      die(
        `Refusing to replace existing ${dstData}. Remove it manually if you want to symlink to ${srcData}.`,
      );
    }
  } else {
    const relTarget = path.relative(targetPath, srcData) || ".";
    symlinkSync(relTarget, dstData, "dir");
  }
}

console.log(
  [
    "Worktree ready:",
    `- main:   ${mainRoot}`,
    `- branch: ${branch}`,
    `- path:   ${targetPath}`,
    "",
    "Next:",
    `- cd ${targetPath}`,
    "- bun run dev (or dev:web / dev:server)",
  ].join("\n"),
);
