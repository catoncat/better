# Context
- User: .scratch is messy; wants workflow skills adjusted to match cleanup plan.
- Existing scripts: task-queue write/archive uses `.scratch/task-queue-archive/`; conversation notes default to `.scratch/` unless `--persist`.

# Decisions
- Archive strategy: keep `.scratch/task-queue-archive/` for queue history; use `.scratch/archive/` for other notes.
- Skill update depth: docs-only updates (adjust SKILL.md guidance; no script changes).

# Plan
1. Update .scratch-related skills to reference `.scratch/index.md` and retention rules:
   - `next`, `task-queue-status`, `claim-task`, `worktree-status`, `note` (if needed for wording).
2. Clarify archive locations in skills:
   - Task queues → `.scratch/task-queue-archive/` (via scripts).
   - Other notes → `.scratch/archive/` (manual moves).
3. Add guidance in skills on keeping `task-queue.md` triage pointer current and updating `.scratch/index.md` when new triage/decisions are created.
4. (Optional) Add a short section in `AGENTS.md` or `.scratch/index.md` (once created) describing the two archive paths and cleanup cadence.

# Findings
- `next` skill writes task queue via `bun scripts/task-queue-write.ts` and forbids overwrite unless completed; should mention index update and archive paths.
- `task-queue-status` references `task-queue-archive` script; `claim-task` updates queue only.
- `worktree-status` on main recommends using `.scratch` for temporary notes.

# Progress
- Gathered skill and script constraints; confirmed user preferences.

# Errors
- None.

# Open Questions
- None.

# References
- `.claude/skills/next/SKILL.md`
- `.claude/skills/task-queue-status/SKILL.md`
- `.claude/skills/claim-task/SKILL.md`
- `.claude/skills/worktree-status/SKILL.md`
- `scripts/task-queue-lib.ts`
- `scripts/task-queue-write.ts`
