# Context
User asked to review `conversation/2026-01-08_121135_prompt_skills_workflow_and_cc_2_1_0.md` and raised concerns:
- Consolidate `.claude/skills` + `.codex/skills` via symlink to avoid drift.
- Warn when MES `plan/` or `impl_align/` docs are missing.
- Whether switching `mes-implement` and `repo-dev-loop` to Claude Code `context: fork` is reasonable; why those vs others.

# Decisions
- If adopting Claude Code frontmatter (`context: fork`, hooks) in `.claude/skills`, avoid a blind full-directory symlink unless `.codex/skills` consumers are confirmed to tolerate the same metadata.
- Use `context: fork` primarily for **read/plan-heavy, verbose, bounded-output** skills; be cautious for write-heavy/debugging skills where main-thread continuity matters.
- Prefer a low-risk pilot (`mes-triage` / preflight portions of `repo-dev-loop`) before forking large implementation skills.

# Plan
1. Update the conversation note to include a short “Why `context: fork`” section (definition, trade-offs, selection heuristic, quick validation steps).
2. Decide skills-sync strategy: (a) shared canonical body + per-tool wrappers, or (b) a `bun` sync script + CI drift check, or (c) full symlink only if compatible.

# Open Questions
- Does Codex CLI’s skill discovery/parsing tolerate Claude Code frontmatter fields in `SKILL.md`?
- Any Windows contributors (git symlink friction), or is macOS/Linux-only acceptable?

# References
- `conversation/2026-01-08_121135_prompt_skills_workflow_and_cc_2_1_0.md`
- `AGENTS.md`
