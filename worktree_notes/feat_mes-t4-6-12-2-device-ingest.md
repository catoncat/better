---
type: worktree_note
createdAt: "2026-01-27T06:55:09.142Z"
branch: "feat/mes-t4-6-12-2-device-ingest"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "Slice 9: Device data ingest/reporting (optional) (T4.6.12.2)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.12.2"
  triageNote: ".scratch/2026-01-27_105743_next_mes_post-merge.md"
touchPoints:
  - "apps/server/src/modules/mes/integration"
  - "packages/db/prisma/schema/schema.prisma"
  - "apps/web"
  - "domain_docs/mes/plan/phase4_tasks.md"
---

# feat/mes-t4-6-12-2-device-ingest - Slice 9: Device data ingest/reporting (optional) (T4.6.12.2)

## Scope
- Goal: Implement optional device data ingest + reporting for SMT production counts (T4.6.12.2) without breaking existing ingest/trace.
- Non-goals: Real device protocol integration; full real-time control loop.
- Risks: Data model choice (Track/DataValue vs report-only) affects schema/API and future trace semantics.

## Slices
- [ ] Slice 9: Device data ingest/reporting (optional) (T4.6.12.2)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T06:55:09.142Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Data model target: pending (Track/DataValue vs report-only).
- Endpoint shape: reuse/extend `POST /api/integration/device-data` (already listed in API overview).

## Open Questions
- What fields are available from devices (mapping confirmation)?
- Should we persist as Track/DataValue (traceable) or store report-only aggregates?

## Findings
- `domain_docs/mes/plan/phase4_tasks.md` lists `T4.6.12.2` as optional device data collection: “生产数据/出入数（贴片机）”, note: “对接设备数采或以 Track/DataValue 报表化”.
- `domain_docs/mes/tech/api/01_api_overview.md` already includes `POST /api/integration/device-data` (likely stub/placeholder).
- `domain_docs/mes/spec/data_collection/02_device_gateway_poc.md` defines `POST /api/integration/device-data` and resolution rules (idempotency via `IntegrationMessage`, track/spec resolution, AUTO vs MANUAL validation) — this matches current implementation.
- `domain_docs/mes/spec/process/compair/smt_forms/生产数据记录表.md` shows the target “生产数据记录表” fields (日期/JOB/数量/开始结束/吸料数量/贴件数量等) which are aggregate/job-level metrics rather than per-unit data.
- Prisma workflow for schema changes: update `packages/db/prisma/schema/schema.prisma`, run `bun run db:migrate -- --name <change>` (dev), `bun run db:generate` is used by `bun run check-types`.
