---
type: worktree_note
createdAt: "2026-01-24T09:55:34.896Z"
branch: "feat/smt-gap-device-poc"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT Gap device data collection POC (T3.2, T3.3)"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "T3.2, T3.3"
  triageNote: "Slice 2: SMT Gap (optional) - device data collection POC"
touchPoints:
  - "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  - "domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md"
  - "apps/server/src/modules/integrations"
  - "apps/server/src/modules/mes"
---

# feat/smt-gap-device-poc - SMT Gap device data collection POC (T3.2, T3.3)

## Scope
- Goal: Add a device data collection gateway POC and auto data ingest path for DataValue with idempotency.
- Non-goals: Full ingest mapping/auto TrackIn/Out execution for AUTO/BATCH/TEST steps.
- Risks: Ambiguous spec mapping without ingestMapping; ensure device events can resolve specs and tracks safely.

## Findings
- Worktree created for Slice 2 on branch `feat/smt-gap-device-poc` and ready for implementation.
- Plan tasks: T3.2 (data collection gateway design + POC) and T3.3 (auto data source ingestion with idempotency/dedup, dataSource=DEVICE auto-confirm).
- Design suggestion doc frames device data collection as optional Phase 3; focus on gateway POC and auto-source ingestion.
- No existing `dataSource`/`DEVICE` references found in `apps/server/src/modules` (needs new integration flow).
- `apps/server/src/modules/integrations` does not exist; current modules are `audit`, `mes`, `meta`, `notifications`, `permissions`, `roles`, `system`, `users`.
- Readiness checks live in `apps/server/src/modules/mes/readiness/service.ts` and compute item status from existing DB records; no device data source handling found yet.
- No `dataSource` field in Prisma schema; readiness models exist around `ReadinessCheck`/`ReadinessCheckItem`.
- `ReadinessCheckItem` stores evidence in `evidenceJson` but has no explicit data source metadata.
- Schema already includes `StencilStatusRecord` and `SolderPasteStatusRecord` with `IntegrationSource` + `eventId`/`eventTime`; `SolderPasteUsageRecord` has `meta` and run/line/step linkage.
- `IntegrationSource` enum exists (AUTO/MANUAL) and integration services live under `apps/server/src/modules/mes/integration/*`.
- Integration routes already include `/integration/stencil-status`, `/integration/solder-paste-status`, `/integration/inspection-result`, plus line binding APIs.
- Integration services (`stencil-service.ts`, `solder-paste-service.ts`) implement idempotency via unique `eventId` + log to `IntegrationMessage`.
- Integration schemas already define receive payloads for stencil/solder paste status with `source` (AUTO/MANUAL) and optional `operatorId`.
- Data collection spec doc exists and defines manual vs auto collection (auto from Ingest or TrackOut payloads).
- Data collection spec service/routes exist under `apps/server/src/modules/mes/data-collection-spec`.
- `DataCollectionSpec` has `method` (AUTO/MANUAL) and `DataValue` uses `TrackSource` as `source`.
- TrackSource enum supports `AUTO`, `MANUAL`, `BATCH`, `TEST`; no `ingest` module exists yet under `apps/server/src/modules/mes/ingest`.
- DataValue usage is concentrated in `apps/server/src/modules/mes/trace/service.ts` and `apps/server/src/modules/mes/fai/service.ts`.
- `apps/server/src/modules/mes/execution/service.ts` handles track-out data collection validation and writes `DataValue` records.
- Track-out data collection currently writes `DataValue` with `source: TrackSource.MANUAL` unconditionally.
- `trackOutSchema` has no source field; integration logging uses `IntegrationMessage` model in Prisma.
- Routing/data collection specs reference ingest events for AUTO/BATCH/TEST and ingest mapping, but no server ingest module yet.
- Integration spec defines a pull/validate → IntegrationMessage persistence → normalize → compile pipeline with dedupe/replay guidance.
- Config spec notes `confirmMode=AUTO` requires `dataSource` of SYSTEM/DEVICE (PrepItemPolicy), but no code references yet.
- No `confirmMode` usage in server code; integration service currently handles work orders only (no device data ingest).
- SMT align doc lacks a device data ingest node; inspection result schemas show a pattern for device event payloads + idempotency.
- `getSnapshotSteps` is used across MES services (execution, trace, station) for route snapshot step resolution.
- No existing usage of `TrackSource.AUTO`; auto device ingestion would be new.
- MES API overview lists integration endpoints; device-data endpoint needs to be added for POC.

## Slices
- [x] Slice 2.1 - Device gateway design doc + plan/align updates
- [x] Slice 2.2 - Device data ingestion endpoint (schema/service/routes) + audit logging

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T09:55:34.896Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Device data gateway POC uses IntegrationMessage dedupeKey (eventId) for idempotency and writes DataValue with TrackSource.AUTO.

## Open Questions
-

## Progress
- Added device data gateway doc + updated SMT gap plan, SMT align, and API overview.
- Implemented `/api/integration/device-data` ingestion with idempotency + audit logging.
- Verification: `bun scripts/smart-verify.ts`.
