---
type: worktree_note
createdAt: "2026-01-24T09:55:11.581Z"
branch: "feat/smt-gap-phase2-1"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT Gap Phase 2.1 event-driven acceptance hardening"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "Phase 2.1 acceptance"
  triageNote: "SMT Gap prioritized per CONTEXT; M4 ingest after; acceptance paused"
touchPoints:
  - "apps/server/src/modules/mes/time-rule/*,packages/db/prisma/schema/schema.prisma"
---

# feat/smt-gap-phase2-1 - SMT Gap Phase 2.1 event-driven acceptance hardening

## Scope
- Goal: close SMT Gap Phase 2.1 acceptance by ensuring event-driven TimeRule traceability + retention is implemented and aligned with docs.
- Non-goals: start M4 ingest; resume UI acceptance.
- Risks: doc/code mismatch on Phase 2.1 acceptance status and retention behavior.

## Slices
- [x] Slice 1: verify as-built vs acceptance, implement gaps, update plan/docs

## Findings
- Phase 2.1 acceptance items still unchecked in plan: event table traceability, event-driven TimeRule creation/complete, 30s polling retry, 30-day retention cleanup.
- Prisma schema has TimeRuleDefinition/TimeRuleInstance models but no `Event` model found.
- Time-rule module contains `startEvent`/`endEvent` fields; no obvious event polling code in `service.ts` (needs deeper inspection).
- Found event infrastructure: `apps/server/src/modules/mes/event/*` and `MesEvent` model in Prisma with status enum (PENDING/PROCESSING/etc.).
- `mes/event/processor.ts` includes TimeRule integration: start/end events create/complete instances; backoff logic defined.
- `processMesEvents` polls pending/failed `mesEvent` records, retries with backoff, and marks completed/failed; batch size default 50.
- `cleanupMesEvents` implements 30-day retention (default) and is wired via cron plugins in `apps/server/src/plugins/*` and registered in `app.ts`.
- `MesEvent` schema includes status/attempts/error/retention fields and indexes; `createMesEvent` upserts idempotently with retention window.
- `trackIn` emits `MES_EVENT_TYPES.TRACK_IN` with run/unit/station payload via `createMesEvent`.
- `trackOut` emits `MES_EVENT_TYPES.TRACK_OUT` with result + routeVersion payload; solder paste usage emits `SOLDER_PASTE_USAGE_CREATE` when issuedAt is set.
- MesEvent cron runs every 30s by default (`*/30 * * * * *`); retention cron runs daily (default 3am) with env overrides.

## Progress
- Marked Phase 2.1 acceptance items complete in `domain_docs/mes/plan/smt_gap_task_breakdown.md`.

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T09:55:11.584Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Root AGENTS only (no nested overrides in this worktree).
-

## Open Questions
-
