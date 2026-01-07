# Repo Dev Loop + Task Slicer Skills

Date: 2026-01-07 10:17:13

## Context
- Agents still tend to commit only once at the end of a task.
- Repo-scoped skills can enforce workflows more reliably than long docs.

## Decisions
- Add two repo-scoped workflow skills (for both Codex and Claude Code):
  - `repo-dev-loop`: default dev workflow (git status, worktree, slicing, commits, conversation sync, bun checks).
  - `task-slicer`: produce 2-6 independently committable slices with commit suggestions.
- Prefer these skills via `AGENTS.md`.

## Plan
- Use `repo-dev-loop` as the default workflow for general coding tasks.
- Use `task-slicer` at the start of any non-trivial task to define commit checkpoints.

## Open Questions
- Should `repo-dev-loop` be referenced explicitly in prompts (e.g. "$repo-dev-loop") to force activation?

## References
- `.codex/skills/repo-dev-loop/SKILL.md`
- `.codex/skills/task-slicer/SKILL.md`
- `.claude/skills/repo-dev-loop/SKILL.md`
- `.claude/skills/task-slicer/SKILL.md`
- `AGENTS.md`
