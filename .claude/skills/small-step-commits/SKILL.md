---
name: small-step-commits
description: 'Enforce small, frequent commits in this repo. Use when implementing or refactoring code, updating docs, or making multi-file changes; ensures work is committed in coherent slices (plan/docs/schema/api/ui) instead of one big end-of-task commit.'
---

# Small-Step Commits

## Goal

Keep changes conflict-friendly by committing early and often.

## Workflow

0. Run `git status` and call out a dirty tree before editing.
1. Define 2-6 slices for the task (examples: plan, docs, schema, api, ui, align).
2. After finishing one slice:
   - Stage only the relevant files (avoid `git add .` unless the slice is truly repo-wide).
   - Commit immediately (do not wait for the entire task).
3. If you must stop mid-slice, make a `wip:` commit and continue in the next commit.

## Commit Rules

- Prefer buildable commits; use `wip:` only when necessary.
- Do not commit secrets or local env files (`apps/server/.env`, `.env*`, `data/`).
- When using worktrees, run `bun run lint` / `bun run check-types` inside the worktree you plan to merge.

## Commit Message Pattern

- `feat(<scope>): <summary>`
- `fix(<scope>): <summary>`
- `docs(<scope>): <summary>`
- `chore(<scope>): <summary>`
- `wip: <summary>`

Scope examples: `mes`, `web`, `server`, `db`, `docs`, `workflow`.
