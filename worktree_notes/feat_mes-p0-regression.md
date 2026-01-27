---
type: worktree_note
createdAt: "2026-01-27T11:07:19.735Z"
branch: "feat/mes-p0-regression"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "Slice 2: Automate P0 regression checks"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "P0 acceptance criteria"
  triageNote: ".scratch/2026-01-27_173030_next_mes.md"
touchPoints:
  - "apps/server/src/testing"
  - "apps/server/scripts/test-mes-flow.ts"
  - "scripts/mes-acceptance.ts"
---

# feat/mes-p0-regression - Slice 2: Automate P0 regression checks

## Scope
- Goal: Add automated integration tests for MANUAL execution path (P0 #4)
- Non-goals: Not changing acceptance scripts; not adding new P0 tests for ingest (already covered)
- Risks: None - existing ingest tests already pass

## Slices
- [x] Slice 2: Automate P0 regression checks

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T11:07:19.736Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - domain_docs/mes/CONTEXT.md
  - domain_docs/mes/plan/phase4_tasks.md
  - user_docs/demo/acceptance_plan_smt.md
  - user_docs/demo/README.md
  - worktree_notes/feat_mes-doc-alignment.md
- Next:
  - Commit worktree note: git add worktree_notes/feat_mes-p0-regression.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Created `mes-manual-regression.test.ts` for MANUAL TrackIn/TrackOut path
- P0 #1-3 already covered by `mes-ingest-batch.test.ts`
- Use `operator@example.com` for execution tests (has EXEC_TRACK_IN/OUT permissions)

## Open Questions
- (none)
