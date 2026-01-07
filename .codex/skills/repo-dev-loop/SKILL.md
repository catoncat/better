---
name: repo-dev-loop
description: 'Repo-wide default development workflow for this repository. Use when the user asks to implement/build/fix/refactor/change code or docs (实现/开发/修复/重构/改代码/改文档). Enforces git-status preflight, worktree decision, task slicing, small-step commits, conversation sync notes, and bun-based verification (lint/typecheck) in the worktree being merged.'
---

# Repo Dev Loop

## Goal

Make changes conflict-friendly and reviewable by committing in small slices instead of one big end-of-task commit.

## Workflow

0. Preflight:
   - Run `git status`.
   - If not clean, call it out and resolve first (commit/stash/switch worktree).
1. Decide worktree:
   - If the task is high-churn (DB schema, core routing/execution, large UI refactor), recommend a dedicated `git worktree` + branch.
   - Offer: `bun scripts/worktree-new.ts <branch> <path>`.
2. Slice the task:
   - If the task is non-trivial (multiple files or multiple domains), create 2-6 slices (use `task-slicer`).
   - Each slice should be independently committable.
3. Implement slice-by-slice:
   - After finishing one slice, stage only relevant files and commit immediately.
   - Do not wait for full task completion.
   - If you must stop mid-slice, commit `wip:` and continue next.
4. Sync decisions:
   - If a response includes discussion/plan/decision, write `conversation/YYYY-MM-DD_HHMMSS_<topic>.md` (timestamp via `date '+%Y-%m-%d_%H%M%S'`).
   - Include: Context, Decisions, Plan, Open Questions, References.
5. Verify before merge:
   - Run `bun run lint` and `bun run check-types` in the branch/worktree you plan to merge.

## Commit Checkpoints (Default)

Commit at these boundaries (even if the overall task is not done):

- Plan/doc update completed
- Schema/migration completed
- One API endpoint (route + service + tests) completed
- One UI screen/dialog completed
- Align/backfill updates completed

## Staging Rules

- Avoid `git add .` unless the slice is truly repo-wide.
- Prefer: `git add <files...>` then `git commit -m "<type>(<scope>): <summary>"`.

## Commit Message Pattern

- `feat(<scope>): <summary>`
- `fix(<scope>): <summary>`
- `docs(<scope>): <summary>`
- `chore(<scope>): <summary>`
- `wip: <summary>`

Scope examples: `mes`, `web`, `server`, `db`, `workflow`.
