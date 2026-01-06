# Codex Workflow: Parallel Tracks + Conversation Sync

Date: 2026-01-06 22:46:18

## Decisions
- Codex does not try to infer whether the user is running multiple Codex sessions.
- When doing "what next" (MES triage), Codex proposes 2-4 parallelizable tracks and calls out conflicts (shared touch points) explicitly.
- If a response includes discussion/plan/decision, Codex writes a synced note under `conversation/` with a timestamp in the filename (`YYYY-MM-DD_HHMMSS_<topic>.md`).

## Rationale
- Parallel tracks are inferred from task conflicts, not from external session state.
- Timestamped notes reduce lost context when work is split across branches/worktrees/sessions.

## References
- `AGENTS.md`
- `/Users/envvar/.codex/skills/mes-triage/SKILL.md`
- `/Users/envvar/.codex/skills/mes-implement/SKILL.md`
