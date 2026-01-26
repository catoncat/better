---
type: worktree_note
createdAt: "2026-01-26T14:05:47.234Z"
branch: "feat/mes-smt-t4-6-12-forms-split"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "SMT T4.6.12: confirm & split remaining forms"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.12"
  triageNote: ".scratch/2026-01-26_124800_next_mes_triage.md"
touchPoints:
  - "domain_docs/mes/spec/process/compair/smt_form_collection_matrix.md"
  - "domain_docs/mes/spec/process/compair/smt_form_collection_matrix_user_confirmed.md"
  - "domain_docs/mes/spec/process/compair/smt_forms"
  - "domain_docs/mes/plan/phase4_tasks.md"
---

# feat/mes-smt-t4-6-12-forms-split - SMT T4.6.12: confirm & split remaining forms

## Scope
- Goal: Consolidate the confirmed SMT form collection decisions into the matrix, then split any remaining in-scope forms into actionable plan items.
- Non-goals: Implement new form modules / integrations in this slice.
- Risks: Some forms are explicitly “not in MES” per user confirmation; ensure plan reflects the decision and doesn’t create accidental scope creep.

## Slices
- [ ] Docs: complete smt_form_collection_matrix.md
- [ ] Plan: split remaining SMT forms into tasks

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-26T14:05:47.235Z
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
-

## Open Questions
-
