# Context
- User reports `.scratch/` is messy; wants assessment + improvement plan.
- Repo state: working tree has modified `apps/web/src/routeTree.gen.ts` (likely generated).
- `.scratch/` contains ~26 files with overlapping triage/queue notes and reviews.

# Decisions
- Cleanup level: **Moderate** (keep only current queue + latest triage + active notes; archive the rest).
- History location: **Archive in `.scratch/archive/`** (not in Git).
- Guardrails: **Add `.scratch/index.md` + naming/retention rules** (no automation script).

# Plan
1. Identify “current/active” files: `task-queue.md`, latest triage note referenced by it, `agent_session.md`, active worktree notes (if any).
2. Create `.scratch/archive/` (optionally date-bucketed `archive/YYYY-MM/`).
3. Move older/duplicate triage + review notes into archive; keep latest triage + queue in root.
4. Create `.scratch/index.md` as single source of truth: current files list, retention policy, naming conventions, and creation workflow.
5. Update `task-queue.md` header to reference latest triage note and add a “last updated” timestamp if missing.
6. Add brief summary of the cleanup and policy to `.scratch/agent_session.md`.

# Findings
- `task-queue.md` shows 10 slices; 2 in progress, 4 pending, 4 completed; references `2026-01-27_105743_next_mes_post-merge.md`.
- `triage_session_notes.md` appears stale (mentions 5 slices) and notes a prior overwrite failure (`noclobber`).
- `task-queue-review.md` documents older queue variants (AI #1 vs AI #2) and indicates historical overwrites.

# Progress
- Collected current `.scratch/` inventory and key recent notes.

# Errors
- None.

# Open Questions
- None (preferences confirmed).

# References
- `.scratch/task-queue.md`
- `.scratch/triage_session_notes.md`
- `.scratch/2026-01-27_105743_next_mes_post-merge.md`
- `.scratch/task-queue-review.md`
