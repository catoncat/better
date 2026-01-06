# Worktree Bootstrap + Plan/Decision Sync

Date: 2026-01-07 00:01:44

## Problems Observed
1. Some agents do not persist plans after "plan mode".
2. Parallel edits in one working tree make `bun run lint` / `bun run check-types` noisy (other in-flight files fail).
3. New worktrees need local bootstrap: `bun install`, server env copy, shared `data/` for DB.

## Decisions
- Always start by checking `git status` and call out a dirty tree before proceeding.
- For "what next" triage, propose parallelizable tracks and call out conflicts (shared touch points).
- Prefer a dedicated `git worktree` per high-churn task/track; run lint/typecheck inside that worktree.
- Persist any discussion/plan/decision to `conversation/YYYY-MM-DD_HHMMSS_<topic>.md` and include the plan content when applicable.

## Worktree Bootstrap
- Script: `bun scripts/worktree-new.ts <branch> <path>`
  - Creates the worktree (creates branch if missing)
  - Runs `bun install`
  - Copies `apps/server/.env` if present
  - Symlinks `data` to the main worktree's `data` (if present)

## References
- `AGENTS.md`
- `scripts/worktree-new.ts`
- `/Users/envvar/.codex/skills/mes-triage/SKILL.md`
- `/Users/envvar/.codex/skills/mes-implement/SKILL.md`
