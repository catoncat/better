# workflow_worktree-notes_smart-verify_implementation

## Context
- Goals:
  - Doc-only changes should skip `bun run lint` / `bun run check-types`.
  - Creating a worktree should carry task context into the new branch directory.
  - Asking “当前分支做到哪了/还差什么” should use branch-local context (no full re-triage).
  - Skills docs should be shorter and less repetitive.

## Decisions
- Use tracked `worktree_notes/` for branch-scoped task context (not `.codex/` local files).
- Use `scripts/smart-verify.ts` as the single deterministic entrypoint for verification:
  - doc-only change set → skip; otherwise run lint + check-types.
- Add a dedicated `worktree-status` skill and a deterministic status updater script.

## Plan
- Implement `worktree_notes/` contract and note generation via `scripts/worktree-new.ts` options.
- Add `scripts/smart-verify.ts` and wire it into repo docs and key skills.
- Add `scripts/worktree-note-status.ts` and a new `worktree-status` skill for progress/status questions.
- Run `bun scripts/smart-verify.ts --base origin/main` as a smoke check.

## Open Questions
- `user_docs/demo/guide.md` currently has unrelated doc edits in the working tree; confirm whether to keep or restore.
- Whether to add an `agent_workflows/pre-merge.json` (control-plane) wrapper for `scripts/smart-verify.ts`.

## References
- `conversation/2026-01-13_105833_worktree-context-design.md`
- `conversation/2026-01-13_110746_smart-verification-design.md`
- `conversation/2026-01-13_110958_skills-optimization-design.md`
- `worktree_notes/README.md`
- `scripts/worktree-new.ts`
- `scripts/worktree-note-status.ts`
- `scripts/smart-verify.ts`
- `AGENTS.md`
- `.claude/skills/worktree-status/SKILL.md`
