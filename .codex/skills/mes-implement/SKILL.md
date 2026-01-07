---
name: mes-implement
description: 'Repo-specific MES implementation workflow. Use when the user asks to implement /build/fix/change MES features (server/web/db/docs) in this repo, especially anything under domain_docs/mes. Enforce plan-first work, and enforce the doc contract: flow = diagram + notes + references only; impl_align = node name to API/Server/Web mapping only (no status); plan = the only progress tracker. Ensure flow node names and impl_align node names match exactly.'
---

# MES Implement

## Goal

Implement one selected MES task end-to-end while keeping plan/flow/align as single-responsibility sources.

## Doc Contract (Do Not Violate)

- Plan: progress tracking lives only in `domain_docs/mes/plan/`.
- Flow: `domain_docs/mes/spec/process/*` is diagram + notes + references only. No status tables. No API lists.
- Align: `domain_docs/mes/spec/impl_align/*` is node name to API/Server/Web mapping only. No status. Node name must match the flow node label exactly.
- No emoji in `domain_docs/mes`.

## Workflow

0. Before coding (parallel work + commits):
   - Check `git status`; if not clean, ask the user whether to switch to a worktree or to commit/stash before proceeding.
   - If the change is large/high-churn, recommend using a dedicated `git worktree` + branch.
   - Worktree bootstrap (recommended):
     - `bun scripts/worktree-new.ts <branch> <path>` (run from the main checkout; creates the worktree, runs `bun install`, copies `apps/server/.env` if present, symlinks `data`)
     - Or manually: `bun install`, copy `apps/server/.env`, symlink `data` to the main worktree
   - If using a worktree for a large task, prefer a worktree-scoped plan file under `domain_docs/mes/plan/` (e.g. `worktree_*_todo.md`) and backfill `phase2_tasks.md` after merge.
   - Commit in small steps and do not wait for full task completion. If needed, use `wip:` commits and follow with a cleanup commit.
1. Confirm scope with short questions if needed:
   - What is the user-visible behavior and the blocking rules?
   - What states are affected (Run/WO/Unit)?
   - What is the failure branch (defect/disposition, MRB, retry)?
   - What UI entry point is required (runs page, execution page, dialog)?
2. Identify the plan item:
   - Require a reference to `domain_docs/mes/plan/*`.
   - If missing, add a new task breakdown to the plan first (no implementation yet).
   - If the response includes discussion/plan/decision, sync it to `conversation/YYYY-MM-DD_HHMMSS_mes_<topic>.md` (timestamp via `date '+%Y-%m-%d_%H%M%S'`).
3. Update docs before code only when needed:
   - If the process changes (new/changed node): update the relevant flow doc (diagram + notes + references only).
   - Do not update align until code exists.
4. Implement code:
   - Follow `agent_docs/03_backend/api_patterns.md`.
   - Keep changes minimal and aligned with existing modules under `apps/server/src/modules/mes` and `apps/web/src/routes/_authenticated/mes`.
5. Update align:
   - Add/adjust rows in the corresponding `domain_docs/mes/spec/impl_align/*.md`.
   - Ensure node names match the flow doc exactly.
6. Update plan:
   - Mark tasks done only in the plan file(s).
7. Verify:
   - Run `bun run check-types`.
   - Run `bun run lint` (fix with `bun run lint:fix` and `bun run format` if needed).
   - Run the narrowest relevant tests if the touched package exposes them.
   - Sanity doc checks: `rg -nP \"\\p{Extended_Pictographic}\" domain_docs/mes` (must be empty).

## Commit Checkpoints (Default)

If the task includes multiple slices, do not wait to the end. Commit after each slice:

- Plan updates: `domain_docs/mes/plan/*`
- Schema/migration: Prisma + generated client changes
- API/service: server routes/services
- UI: web routes/components/hooks
- Docs alignment: flow/align/conversation sync notes

## When Not To Use

Do not use this workflow for pure “what next” triage; use `mes-triage` instead.
