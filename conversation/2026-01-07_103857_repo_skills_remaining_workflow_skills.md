# repo_skills_remaining_workflow_skills

## Context
- Continue repo-level skills so Codex and Claude Code follow the same workflow.
- Focus: small-step commits, worktrees for parallel work, conversation note syncing.

## Decisions
- Skills are checked into both `.codex/skills/**` and `.claude/skills/**`.
- Add a small helper script to create timestamped conversation notes.
- Add thin wrapper skills for backend/db/web patterns that reference `agent_docs/**` rather than duplicating large docs.

## Plan
- Add `conversation-sync` skill + `scripts/conversation-new.ts`.
- Add `worktree-bootstrap` skill (use `scripts/worktree-new.ts`).
- Add `pre-merge-checklist` skill.
- Add wrapper skills: `backend-api-endpoint`, `db-prisma-change`, `web-list-page`, `web-form-dialog`.
- Run `bun run lint` and `bun run check-types` for validation.

## Open Questions
- None.

## References
- `scripts/conversation-new.ts`
- `.codex/skills/conversation-sync/SKILL.md`
- `.codex/skills/worktree-bootstrap/SKILL.md`
- `.codex/skills/pre-merge-checklist/SKILL.md`
- `.codex/skills/backend-api-endpoint/SKILL.md`
- `.codex/skills/db-prisma-change/SKILL.md`
- `.codex/skills/web-list-page/SKILL.md`
- `.codex/skills/web-form-dialog/SKILL.md`
- Lint currently fails in unrelated files under `apps/web/src/routes/_authenticated/mes/integration/*` and `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`.
