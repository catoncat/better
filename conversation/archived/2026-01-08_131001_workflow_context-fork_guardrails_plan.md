# workflow_context-fork_guardrails_plan

## Context
- User wants an executable improvement plan for the repo’s agent workflow (skills + prompts), specifically leveraging Claude Code 2.1.0 features (hot-reload, `context: fork`, `agent`, `language`) while keeping `mes-implement` stable as the main implementation workflow.
- Key concerns: avoid duplicated maintenance between `.claude/skills` and `.codex/skills`; warn when MES plan/align docs are missing; use `context: fork` safely (pilot first).

## Decisions
- Treat `mes-implement` as the “main path” and do NOT move it to `context: fork` in the first iteration; pilot on read/triage/preflight skills first.
- Prefer a skills dedupe mechanism that allows future Claude-only frontmatter (e.g., `context: fork`) without risking Codex parsing/regressions; pick symlink only if compatibility is acceptable for the team/platforms.

## Plan
- Slice 1: Document policy + acceptance criteria (what we change, what we won’t), and update the existing workflow note with an explicit “why/when `context: fork`” section.
- Slice 2: Eliminate skills drift between `.claude/skills` and `.codex/skills` (symlink or `bun` sync script) and add a drift check.
- Slice 3: Add MES doc-guard warnings (plan/align presence) via a deterministic `bun` script and integrate it into MES-related skills / pre-merge checks.
- Slice 4: Pilot `context: fork` on a low-risk skill (e.g., `mes-triage` and/or `repo-dev-loop` preflight), confirm output quality and main-thread handoff, then decide whether to expand.
- Slice 5: Adoption docs: how to use Claude Code 2.1.0 hot-reload + recommended settings (`respectGitignore`, `language`) without committing secrets.

## Open Questions
- Skills sync strategy: full symlink (fastest) vs generator/sync script (most robust for tool-specific frontmatter).
- Should we commit a tracked `.claude/settings.example.json` (requires `.gitignore` exception) or keep settings guidance only in docs?
- Current dirty tree contains an unintended change to `domain_docs/mes/CONTEXT.md`; keep it (after validation) or discard it to avoid doc drift.

## References
- `conversation/2026-01-08_121135_prompt_skills_workflow_and_cc_2_1_0.md`
- `.claude/skills/mes-implement/SKILL.md`
- `.claude/skills/mes-triage/SKILL.md`
- `.claude/skills/repo-dev-loop/SKILL.md`
- `.claude/skills/pre-merge-checklist/SKILL.md`
