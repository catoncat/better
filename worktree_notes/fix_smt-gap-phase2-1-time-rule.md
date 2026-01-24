---
type: worktree_note
createdAt: "2026-01-24T10:43:10.834Z"
branch: "fix/smt-gap-phase2-1-time-rule"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "Fix Phase 2.1 time-rule event wiring"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "Phase 2.1"
  triageNote: ".scratch/task-queue.md"
touchPoints:
  - "apps/server/scripts/seed-time-rules.ts"
  - "apps/server/src/modules/mes/time-rule/service.ts"
  - "packages/db/prisma/schema/schema.prisma"
  - "apps/server/src/modules/mes/execution/service.ts"
---

# fix/smt-gap-phase2-1-time-rule - Fix Phase 2.1 time-rule event wiring

## Scope
- Goal: fix time rule end-event mismatch, WASH step matching, and active instance uniqueness.
- Non-goals: new ingest features or unrelated MES flow changes.
- Risks: Phase 2.1 acceptance already marked complete; fix may require retroactive doc updates.

## Findings
- Phase 2.1 acceptance is already marked complete in `domain_docs/mes/plan/smt_gap_task_breakdown.md`.
- Only `SOLDER_PASTE_USAGE_CREATE` exists in mes event types; no return/consume event yet.
- Solder paste usage records are create-only (no update/return endpoint), so no end-event is emitted today.
- Line solder paste unbind exists in integration routes but does not emit a mes event.
- Solder paste unbind service has access to lotId; could emit end-event there.
- Prisma change required; migrations live under `packages/db/prisma/schema/migrations`.
- `prisma migrate dev` is non-interactive here; use `prisma migrate diff --from-migrations ... --to-schema-datamodel ... --script` to generate SQL.
- Domain docs reference `SOLDER_PASTE_USAGE_CREATE` as the only solder paste event; need to add `SOLDER_PASTE_USAGE_UNBIND` in plan/config docs.

## Errors
- `bun run db:migrate -- --name time_rule_instance_active_key` failed due to drift in main DB (ReflowProfile tables). Next approach: rerun migrate with a clean temp `DATABASE_URL` to generate migration without resetting main DB.
- `DATABASE_URL=file:/tmp/better-smt-gap-fix.db bun run db:migrate -- --name time_rule_instance_active_key` failed because `prisma migrate dev` is non-interactive. Next approach: generate migration SQL via `prisma migrate diff` and create migration folder manually.
- `bunx prisma migrate diff --from-migrations ... --to-schema-datamodel ...` failed; CLI now requires `--to-schema`. Next approach: rerun with `--from-migrations ... --to-schema packages/db/prisma/schema/schema.prisma --script`.
- `bunx prisma migrate diff ... --to-schema ... --script > migration.sql` failed due to shell noclobber. Next approach: use `>|` to overwrite.
- `prisma migrate diff` from repo root produced empty output; running from `packages/db` produced unrelated diff (MaintenanceRecord). Resolved by writing minimal migration SQL manually for activeKey.
- `bun scripts/smart-verify.ts` failed: Prisma `StringFilter` for SQLite doesn't support `mode`. Fixed by switching to in-memory case-insensitive check after selecting operation codes.
- `bun run db:deploy` failed: migration `20260122132640_add_fixture_usage_record` tried to create `ReflowProfile` but table already exists. Need to reconcile migration history (likely `prisma migrate resolve`).
- `bun apps/server/scripts/seed-time-rules.ts` failed: `DATABASE_URL` missing. Next approach: rerun with `DATABASE_URL=file:/Users/envvar/lzb/better/data/db.db`.
## Slices
- [ ] Fix time rule end-event + WASH match + active instance uniqueness

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T10:43:10.835Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - domain_docs/mes/plan/smt_gap_task_breakdown.md
  - worktree_notes/feat_smt-gap-phase2-1.md
- Next:
  - Commit worktree note: git add worktree_notes/fix_smt-gap-phase2-1-time-rule.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Use `SOLDER_PASTE_USAGE_UNBIND` as end-event for solder paste exposure; emit on line unbind with entityId=lotId.
- Add `activeKey` unique guard on time rule instances and clear on completion/expiry/waive.

## Open Questions
-
