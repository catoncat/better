# Context
The repo uses `AGENTS.md` plus `.claude/skills/` and `.codex/skills/` to enforce workflow rules. User requested a summary of the current prompt/skills workflow and research on Claude Code 2.1.0 updates and external best practices, with suggestions to improve the existing system.

# Decisions
- Use existing repo guidance as the primary source of truth for current workflow.
- Use Context7 and Jina MCP sources to summarize official changelog and best‑practice guidance.

# Plan
1. Summarize current prompt engineering + skills workflow from repo docs.
2. Summarize Claude Code 2.1.0 changes that affect skills/hooks/workflow.
3. Propose concrete improvements to current workflow based on official docs and community best practices.

# Summary
## Current prompt + skills workflow (repo)
- Central rules live in `AGENTS.md` and are mirrored by `CLAUDE.md`/`GEMINI.md` (symlinks). Key rules: always use `bun`, run `bun run lint`/`bun run check-types`, start each turn with `git status`, update docs alongside code, and use worktrees for dirty/high‑churn work. Workflow for MES requires updating `domain_docs/mes/plan/*`, and align/flow files for any implementation changes.
- Skills in `.claude/skills/` and `.codex/skills/` encode specialized workflows: `repo-dev-loop`, `task-slicer`, `mes-triage`, `mes-implement`, `backend-api-endpoint`, and others. These skills demand preflight (`git status`, worktree checks), enforce documentation updates, and require conversation sync notes when a plan or decision is produced.
- Conversation notes record skill trigger keywords in CN/EN to improve auto‑invocation and preserve the expected workflow behavior.

## Claude Code 2.1.0 changes relevant to this workflow
- Skills hot‑reload: new or modified skills in `~/.claude/skills` or `.claude/skills` are picked up without restart. This pairs well with the repo’s heavy reliance on skills for workflow governance.
- Skill frontmatter adds `context: fork` to run skills/slash commands in a forked sub‑agent context (reduces main‑thread context bloat for long skills).
- Skill frontmatter adds `agent` field to specify execution agent type.
- Hooks expanded: hooks can be defined in agent/skill/slash‑command frontmatter, and PreToolUse hooks can return `updatedInput` while still requesting permission.
- CLI settings: `language` response setting and `respectGitignore` for file picker behavior.
- Security: fixes to avoid sensitive data leaks in debug logs.

## External best practices (official + community)
- Use hooks to enforce policy and safety checks (e.g., pre‑commit validation, block risky commands) with careful input sanitization and absolute paths.
- Keep skills in project scope (`.claude/skills`) for team‑shared workflows; treat skills as executable dependencies and review them like code.
- Prefer planning modes for complex work; use small, coherent commits that map to plan checkpoints.
- Use git worktrees to isolate parallel tasks and reduce tool noise; avoid reusing branches across worktrees.

# Improvement ideas for this repo (actionable)
1. Enable skill hot‑reload as a workflow: update skill content frequently without restarting sessions, and formalize a short “skill change checklist” (update both `.claude/skills` and `.codex/skills` if duplicated).
2. Move long‑running or verbose skills to `context: fork` to reduce main context bloat (e.g., `mes-implement`, `repo-dev-loop`), keeping the main thread focused on the user request.
3. Add agent‑specific hooks in skill frontmatter for enforcement (e.g., pre‑tool checks: block non‑`bun` commands, enforce `git status` preflight, or warn when plan/align docs are missing).
4. Use `respectGitignore` to avoid accidental selection of generated artifacts in file pickers.
5. Define a minimal “security hygiene” hook set (warn/block on `rm -rf`, editing `.env`, or committing secrets). Use `updatedInput` to auto‑rewrite safe alternatives when possible.
6. Document skill trigger keywords in both EN/CN and reference them in `AGENTS.md` to improve invocation reliability.
7. Add a dedicated “docs‑sync” skill to enforce the MES documentation contract (plan/flow/align updates).

## Actionable checklist (start order)
- Fork context first: switch `mes-implement` and `repo-dev-loop` to `context: fork`; confirm outputs still reach main thread.
- Hook guardrails: add PreToolUse hook to warn/block non-`bun` commands and missing `git status` preflight.
- Secrets safety: add hook rules for `.env`, `credentials.*`, and `rm -rf` with `updatedInput` safe fallbacks.
- Reduce skill drift: add a short checklist to keep `.claude/skills` and `.codex/skills` in sync, or decide to consolidate.
- File picker hygiene: enable `respectGitignore` to avoid generated artifacts.
- Skill triggers: update CN/EN trigger keywords in `AGENTS.md` and skill frontmatter.

# Open Questions
- Should we consolidate duplicated skills between `.claude/skills` and `.codex/skills` to reduce drift?
- Which high‑churn skills should be moved to `context: fork` first?
- Do we want an explicit “hook policy” document in `AGENTS.md` or keep it as skill‑level rules?

# References
- `AGENTS.md`
- `.claude/skills/*/SKILL.md`
- `.codex/skills/*/SKILL.md`
- https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- https://docs.anthropic.com/en/release-notes/claude-code
- https://docs.anthropic.com/en/docs/claude-code/hooks
- https://docs.claude.com/en/docs/claude-code/skills
- https://docs.claude.com/en/docs/agents-and-tools/agent-skills
- https://git-scm.com/docs/git-worktree.html
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://blog.sshh.io/p/how-i-use-every-claude-code-feature
- https://www.arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning
- https://code.claude.com/docs/en/skills
