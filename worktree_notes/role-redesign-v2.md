---
type: worktree_note
createdAt: "2026-01-22T06:08:07.618Z"
branch: "role-redesign-v2"
baseRef: "origin/main"
task:
  title: "Role redesign v2 (MES): preset roles + seeds + docs"
  triageNote: "Replace leader role; add material/trace; align seeds/demos/docs"
---

# role-redesign-v2 - Role redesign v2 (MES): preset roles + seeds + docs

## Scope
- Goal: Redesign MES roles (remove leader, add material + trace), update preset roles + seed data + demos/tests + docs.
- Non-goals: RBAC engine refactor; permission model changes; new UI pages.
- Risks: Demo/test scripts depend on leader login; doc drift if not updated together.

## Slices
- [ ] Slice 0: worktree note context
- [ ] Slice 1: preset roles + role labels/home pages (code)
- [ ] Slice 2: seed + demo/test scripts + login defaults
- [ ] Slice 3: RBAC/permission docs + config samples

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T06:08:07.618Z
- BaseRef: origin/main
- CommitsAheadOfBase: 9
- Dirty: true
- ChangedFiles:
  - conversation/2026-01-22_121824_mes-next_triage_2026-01-22.md
  - domain_docs/mes/CONTEXT.md
  - domain_docs/mes/spec/process/compair/smt_form_collection_matrix_user_confirmed.md
  - user_docs/demo/guide.md
  - worktree_notes/main.md
- Next:
  - Commit worktree note: git add worktree_notes/role-redesign-v2.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Remove `leader` role; add `material` (上料员/物料员) + `trace` (追溯只读).
- Run authorize/close: planner; readiness check/waive: quality; loading verify: material; execution: operator.

## Open Questions
- None.
