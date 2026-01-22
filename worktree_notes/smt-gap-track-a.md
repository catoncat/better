---
type: worktree_note
createdAt: "2026-01-22T08:32:19.238Z"
branch: "smt-gap-track-a"
baseRef: "origin/main"
task:
  title: "Track A: Readiness Model Extension - Extend Readiness to support new PREP_* check types and waiver mechanism"
  triageNote: "conversation/2026-01-22_161944_mes-next_smt-gap-phase1.md"
touchPoints:
  - "packages/db/prisma/schema/schema.prisma"
  - "apps/server/src/modules/mes/readiness/"
  - "apps/web/src/routes/_authenticated/mes/runs/"
---

# smt-gap-track-a - Track A: Readiness Model Extension - Extend Readiness to support new PREP_* check types and waiver mechanism

## Scope
- Goal:
- Non-goals:
- Risks:

## Slices
- [x] T1.1 - Extend ReadinessCheckType enum with PREP_* check types ✅ (577d1e2)
- [ ] T1.2 - Waiver API for controlled bypass of non-gate prep items
- [ ] T1.3 - Prep Dashboard UI for new prep checks

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T08:32:19.239Z
- BaseRef: origin/main
- CommitsAheadOfBase: 11
- Dirty: true
- ChangedFiles:
  - "domain_docs/mes/spec/process/compair/MES \347\263\273\347\273\237\350\277\233\345\272\246\345\260\217\347\273\223.md"
  - "domain_docs/mes/spec/process/compair/SMT \350\241\250\345\215\225\351\207\207\351\233\206\347\241\256\350\256\244\350\241\250.md"
  - AGENTS.md
  - conversation/2026-01-22_121824_mes-next_triage_2026-01-22.md
  - conversation/2026-01-22_125406_SMT_basic_merge_review_questions__rule_update.md
  - conversation/2026-01-22_125844_SMT_basic_merge_decisions_linerun_evidence.md
  - conversation/2026-01-22_133301_Production_exception_record_creator_role.md
  - conversation/2026-01-22_134753_Production_exception_record_creator_role_decision_update.md
  - conversation/2026-01-22_135225_Role_redesign_v2_planning.md
  - conversation/2026-01-22_152546_SMT_gap_doc_updates.md
  - conversation/2026-01-22_161944_mes-next_smt-gap-phase1.md
  - domain_docs/mes/CONTEXT.md
  - domain_docs/mes/plan/smt_gap_task_breakdown.md
  - domain_docs/mes/spec/process/compair/smt_form_collection_matrix_user_confirmed.md
  - domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md
  - user_docs/demo/guide.md
  - worktree_notes/main.md
- Next:
  - Commit worktree note: git add worktree_notes/smt-gap-track-a.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-
