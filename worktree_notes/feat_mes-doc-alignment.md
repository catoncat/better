---
type: worktree_note
createdAt: "2026-01-27T10:33:38.596Z"
branch: "feat/mes-doc-alignment"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "Track C: Doc alignment for acceptance entrypoints"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "P0 acceptance docs"
  triageNote: ".scratch/2026-01-27_173030_next_mes.md"
touchPoints:
  - "domain_docs/mes/CONTEXT.md"
  - "domain_docs/mes/plan/phase4_tasks.md"
  - "user_docs/demo/README.md"
  - "user_docs/demo/01_overview.md"
---

# feat/mes-doc-alignment - Track C: Doc alignment for acceptance entrypoints

## Scope
- Goal: Align acceptance doc references; create SMT acceptance plan entry
- Non-goals: No code changes; no acceptance execution
- Risks: None (doc-only)

## Slices
- [x] Slice 4: Doc alignment for acceptance entrypoints

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T10:33:38.596Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Created `acceptance_plan_smt.md` as entry point (references existing smt/01-05 docs)
- Updated all stale references from `acceptance_plan.md` to `acceptance_plan_smt.md`

## Open Questions
- (none)
