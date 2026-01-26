---
type: worktree_note
createdAt: "2026-01-26T08:59:56.976Z"
branch: "feat/mes-smt-wp6-last-piece"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT WP-6: last piece inspection"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.7"
  triageNote: ".scratch/2026-01-26_124800_next_mes_triage.md"
touchPoints:
  - "domain_docs/mes/plan/phase4_tasks.md"
  - "packages/db/prisma/schema/schema.prisma"
  - "apps/server/src/modules/mes/fai"
  - "apps/web/src/routes/_authenticated/mes"
  - "domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md"
---

# feat/mes-smt-wp6-last-piece - SMT WP-6: last piece inspection

## Scope
- Goal: Support “末件检查” as a first-class Inspection (QR-Pro-05), alongside existing FAI.
- Non-goals: Multi-party signatures; item template engine; fully automated gating without user confirmation.
- Risks: Clarify whether “末件” must gate Run closeout; confirm whether to reuse existing `InspectionType.FQC` or introduce a new enum.
- Guardrails: Run may auto-transition to `COMPLETED` (no OQC rule / sample size 0), so FQC creation must allow non-`IN_PROGRESS` terminal run statuses.

## Slices
- [x] API: FQC (last-piece) endpoints + service
- [x] Web: `/mes/fqc` UI (reuse FAI patterns)
- [x] Docs: phase4 plan + API overview alignment

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-26T08:59:56.979Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - .claude/skills/next/SKILL.md
  - .claude/skills/task-queue-status/SKILL.md
  - scripts/task-queue-archive.ts
  - scripts/task-queue-lib.ts
  - scripts/task-queue-write.ts
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Prefer reusing existing `InspectionType.FQC` for “末件检查” to avoid Prisma enum migration (unless product requires a distinct type).
- Keep WP-6 as record-first: allow manual creation + signature; defer any run closeout gating until requirements are confirmed.

## Open Questions
- Should last-piece inspection gate `Run closeout` (hard/soft), or be record-only?
- Should signature be required (and at which step)?
