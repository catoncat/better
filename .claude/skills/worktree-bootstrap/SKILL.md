---
name: worktree-bootstrap
description: "Set up and use git worktrees for parallel development in this repo (worktree/并行/并发/冲突/分支). Use when tasks can block each other, when running bun lint/typecheck is noisy due to other in-flight edits, or when the user wants to work on multiple branches concurrently."
---

# Worktree Bootstrap

## Goal

Isolate changes so parallel work does not interfere with lint/typecheck and reduces merge conflicts.

## When To Recommend A Worktree

- DB schema/migrations
- Core routing/execution changes
- Large UI refactors
- Any task expected to touch many shared files

## Workflow

0. Preflight:
   - Run `git status` and call out a dirty tree.
1. Create a worktree (preferred):
   - `bun scripts/worktree-new.ts <branch> <path>`
   - Behavior:
     - Creates a git worktree at `<path>` on `<branch>`
     - Runs `bun install`
     - Copies `apps/server/.env` from the current worktree (if present)
     - Rewrites `DATABASE_URL` in the new worktree `.env` to an absolute `file:` path pointing at the canonical main worktree `data/`
2. Use it:
   - `cd <path>`
   - Run `bun run dev` (or `bun run dev:web` / `bun run dev:server`)
3. Verify in the merge target:
   - Run `bun run lint` and `bun run check-types` inside the worktree you plan to merge.
