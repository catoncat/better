---
type: worktree_note
createdAt: "2026-01-27T04:24:13.478Z"
branch: "feat/mes-smt-repair-record"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "T4.6.12.1 QR-Pro-012 维修记录表单化"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.12.1"
  triageNote: ".scratch/2026-01-27_105306_next_mes.md"
touchPoints:
  - "apps/server/src/modules/mes/defect"
  - "apps/server/src/modules/mes/trace"
  - "apps/web/src/routes/_authenticated/mes/rework-tasks.tsx"
  - "apps/web/src/routes/_authenticated/mes/trace.tsx"
  - "packages/db/prisma/schema/schema.prisma"
---

# feat/mes-smt-repair-record - T4.6.12.1 QR-Pro-012 维修记录表单化

## Scope
- Goal: Add QR-Pro-012 repair record capture tied to Defect/ReworkTask and surface in Trace.
- Non-goals: No new RepairRecord table; no acceptance-script changes; no hard gating on rework completion.
- Risks: Fields are minimal/confirmed only; full form is still empty in docs.

## Slices
- [x] Slice 6: QR-Pro-012 repair record

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T04:24:13.478Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - apps/web/src/routeTree.gen.ts
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Store repair record in `ReworkTask.meta.repairRecordV1` (avoid migration until fields finalized).
- Allow write only when rework task is OPEN (read-only otherwise).
- Surface repair summary in trace defects payload + UI.

## Open Questions
- Whether to allow edits after task is DONE/CANCELLED (default: disallow).

## Progress
- Implemented repair record API + trace exposure + web UI dialog.
- Added integration test `mes-repair-record.test.ts`.

## Findings
- `domain_docs/mes/spec/process/compair/smt_forms/维修记录表QR-Pro-012.md` is empty; matrix confirms only reason/action/result/responsible.
