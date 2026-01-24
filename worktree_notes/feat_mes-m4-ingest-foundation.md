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
- API patterns: service returns `ServiceResult`, controller handles audit + envelope; external push uses body field idempotency (eventId-style).
- Prisma workflow: update schema + `bun run db:migrate -- --name <change>`; SQLite `DATABASE_URL=file:...`.
- Existing mesEvent service uses `idempotencyKey` upsert pattern; can mirror for ingest events.
- Schema has IntegrationMessage and InspectionResultRecord plus MesEvent table; ingest event needs a new model (no existing ingest table).
- Trace schema/service currently omit ingest events; add to response + query by unit/run for M4.
- No existing run-by-sn helper spotted; ingest service can resolve via `db.unit.findUnique({ where: { sn }, include: { run: true } })`.
- MES routes aggregator lives in `apps/server/src/modules/mes/routes.ts`; ingest module must be added there.
- Phase4 plan shows T4.2.1–T4.2.4 for schema/API/service/trace; implement and mark complete when done.
- Run/Unit schema: Run has `routeVersionId`; Unit references `runId` and `sn` is unique. Ingest event can link to `runId` and/or `unitId` when resolved.
- E2E align doc currently has no ingest node; likely needs a new row once API lands.
- E2E flow spec includes AUTO/BATCH/TEST nodes (设备事件进出站/载具进出站/测试结果接入); align file should map them to ingest API once implemented.
- IngestEvent model added to schema with fields for run/unit/sn, payload/normalized, and indexes; enum `IngestEventType` added.
- Added Run/Unit relations to `IngestEvent` in schema for navigation.
- `packages/db/prisma/migrations` directory not present in worktree (only `packages/db/prisma/schema` exists); need to locate migration path before retry.
- Missing migration `20260124105432_time_rule_instance_active_key` is absent in both worktree and main repo; DB drift must be resolved by recreating migration or updating migration history.
- Schema already includes `activeKey` for time-rule instances; migration file needs to be recreated to match drifted DB.
- Migration files live under `packages/db/prisma/schema/migrations`; follow SQL style from recent migrations (CreateTable + CreateIndex).
- Recreated `20260124105432_time_rule_instance_active_key` migration and reran `db:migrate`; new ingest migration `20260124130231_ingest_events` created/applied successfully.
- Ingest migration also created `MaintenanceRecord` table (model existed without prior migration). Decide whether to keep combined migration or split later.
- Use Prisma `P2002` handling pattern (see OQC service) for idempotent create on unique constraints.
- Trace routes use auth+permission plugin and `status()` helper for errors; mirror pattern for ingest API.
- AuditEntityType has INTEGRATION (no ingest-specific enum); use INTEGRATION for ingest audit entries.
- Permission values are defined in db; check `Permission` enum for suitable ingest permission (likely SYSTEM_INTEGRATION).
- Permission enum not found in Prisma schema; likely defined in generated db constants—need to locate `Permission.SYSTEM_INTEGRATION` in codebase.
- Permission constants live in `packages/db/src/permissions/permissions.ts`; use `Permission.SYSTEM_INTEGRATION` for ingest routes.
- Trace service now needs ingestEvents query/response; ingest module added with schema/service/routes.
- E2E align updated to map AUTO/BATCH/TEST ingest nodes to `POST /api/ingest/events`.
- Permission enum not found in Prisma schema; locate in `packages/db/src` constants.
- IngestEvent model added in schema with eventType/sourceSystem/dedupeKey + run/unit links and indexes.
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
- `bun run db:migrate -- --name ingest_events` failed: drift detected (missing migration `20260124105432_time_rule_instance_active_key` in worktree). Next approach: sync migration files from main or resolve via `db:deploy`/`migrate resolve` before retry.

## Slices
- [x] Docs: ingest contract + ingestMapping + acceptance scenario updates (T4.1.1-T4.1.3)
- [x] DB: IngestEvent schema + migration + indexes (T4.2.1)
- [x] API/Service: create API + idempotency + trace query stub (T4.2.2-T4.2.4)

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
