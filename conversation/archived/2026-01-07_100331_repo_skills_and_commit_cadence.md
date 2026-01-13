# Repo Skills + Commit Cadence

Date: 2026-01-07 10:03:31

## Context
- Agents tend to commit only once at the end of a task, which makes conflict resolution harder.
- Skills can be stored in the repo (not only in user-global locations) so both Codex and Claude Code can load them.

## Decisions
- Check in repo-scoped skills:
  - Codex: `.codex/skills/*`
  - Claude Code: `.claude/skills/*`
- Add a generic commit workflow skill: `small-step-commits` (commit per slice instead of end-of-task).
- Keep existing MES workflow skills in repo: `mes-triage`, `mes-implement`.

## Notes
- `.gitignore` allows `.claude/skills/**` but keeps other `.claude/*` ignored (e.g. `.claude/settings.local.json`).

## References
- `AGENTS.md`
- `.codex/skills/`
- `.claude/skills/`
