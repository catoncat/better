---
type: worktree_note
createdAt: "2026-01-24T09:56:16.114Z"
branch: "feat/mes-m4-ingest-foundation"
baseRef: "origin/main"
dependencies:
  blockedBy:
    - "Slice 1: SMT Gap - Phase 2.1 event-driven acceptance hardening"
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "Slice 3: M4 Ingest foundation (contract + schema + create API idempotency)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.1.1-T4.2.4"
  triageNote: ".scratch/task-queue.md"
touchPoints:
  - "domain_docs/mes/plan/phase4_tasks.md"
  - "domain_docs/mes/spec/traceability/01_traceability_contract.md"
  - "packages/db/prisma/schema/schema.prisma"
  - "apps/server/src/modules/mes"
  - "apps/server/src/modules/mes/ingest"
---

# feat/mes-m4-ingest-foundation - Slice 3: M4 Ingest foundation (contract + schema + create API idempotency)

## Scope
- Goal: define ingest contract + mapping, add persistence + idempotent create API + minimal trace query.
- Non-goals: AUTO/TEST execution mapping (T4.3.x), outbound feedback (T4.5.x).
- Risks: plan notes acceptance priority; dependency on Slice 1 for event-driven acceptance hardening.

## Findings
- Phase 4 plan states acceptance run is highest priority; ingest foundation tasks are T4.1.1-T4.2.4.
- Slice 1 is completed; doc-only prep can move to commit when ready.
- Task queue now shows Slice 1/2 completed; Slice 3 still pending and claimed by this branch.
- User requested doc-only prep now; proceed with contract/mapping/scenario docs only.
- IngestMapping TEST example still uses `kind` instead of `eventType`; should align terminology.
- Traceability + Execution API ingest sections reviewed; no new spec issues found.
- Trace API + acceptance scenario ingest updates reviewed; no changes needed.
- `worktree_notes/` is not in `.gitignore`; include the note update in commits.
- Traceability contract mentions ingest events but has no ingest event schema/contract; needs new section.
- Route execution config mandates ingestMapping for AUTO/BATCH/TEST with required fields per station type; use as baseline for mapping schema.
- Routing engine defines AUTO/BATCH/TEST as ingest event sources; compile requires ingestMapping; TrackOut/ingest must validate required specs.
- Data collection spec notes auto data parsed from ingest events or TrackOut payloads.
- Acceptance scenarios live in domain_docs/mes/tests/01_acceptance_scenarios.md; add AUTO/TEST ingest loop here (existing scenario 4 covers trace query).
- Trace API contract currently lacks ingest event fields; may need to add ingestEvents section for trace response.
- Execution API contract mentions ingest entry points but has no actual ingest contract yet.
- No existing `apps/server/src/modules/mes/ingest` module in repo.
- Trace endpoint exists at `GET /trace/units/:sn`; trace response schema is defined in `apps/server/src/modules/mes/trace/schema.ts`.
- Trace schema currently has no ingest events field; no ingest references in trace module.
- Route execution config API already exposes `ingestMapping` as JSON (`t.Any()`), so mapping schema should be specified in docs.
- Execution API contract has Station Execution section (TrackIn/TrackOut) then jumps to ERP Routing Updates; insert Ingest Events section between them.
- Doc-only prep completed for ingest contract/mapping + acceptance scenario; plan updated.
- Potential spec gap: ingestMapping includes `dedupeKey` path, but API contract requires `dedupeKey` in request; clarify which is source of truth.
- Potential ambiguity: `dataSpecMap` keys/values should align with DataCollectionSpec identifiers (name vs code); confirm and document.
- DataCollectionSpec uses `name` (no code), and TrackOut uses `specName`; `dataSpecMap` should map to spec `name` (or explicitly to `specId` if we add ids).
- Spec gap: ingest API allows optional `runNo`, but doc doesn’t explain how to resolve routeVersion/ingestMapping when `runNo` is missing (sn lookup? route by line/station?). Needs explicit resolution rules.
- Naming mismatch: ingestMapping uses `kind` while ingest API uses `eventType`; should align on one term.
- Acceptance scenario 4.1 doesn’t specify how `sn` is resolved if ingest payload is batch-level or missing; add explicit requirement (e.g., `snPath` must be provided for trace).
- Phase 4 plan marks T4.1.1–T4.1.3 done; if we adjust contract/mapping semantics, consider updating those rows to reflect revisions.

## Errors
- `ls apps/server/src/modules/mes/ingest` → No such file or directory (will only create during implementation; avoid retrying now).
- `rg -n "ingest" apps/server/src/modules/mes/trace` → no matches (trace module currently has no ingest references).

## Slices
- [x] Docs: ingest contract + ingestMapping + acceptance scenario updates (T4.1.1-T4.1.3)
- [ ] DB: IngestEvent schema + migration + indexes (T4.2.1)
- [ ] API/Service: create API + idempotency + trace query stub (T4.2.2-T4.2.4)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T09:56:16.115Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Hold code changes until Slice 1 completes; doc-only prep allowed.
- Ingest API path planned as `POST /api/ingest/events`.
- Align ingestMapping docs to `eventType` (optional; must match stationType) and avoid server-side `dedupeKey` extraction.
- Document Run resolution rules for ingest events when `runNo` is absent (require `sn` / `snList`).

## Open Questions
-
