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

## Progress
- Updated preset roles: removed leader, added material/trace, planner gains run authorize/close, operator gains exec data collect, admin drops business config perms.
- Updated role label map in web constants.
- Updated seed/test/demo scripts and login examples to use material/operator/planner/quality instead of leader.
- Updated MES RBAC/permission docs, config samples, and user role guides to align with new roles.
- Merge prep: reviewed decision notes, ready to commit conversation records before syncing with main.

## Errors
- apply_patch failed updating `apps/server/scripts/test-mes-flow.ts` (context mismatch around readiness/authorize block). Next: patch in smaller hunks after re-reading exact lines.
- Found leader references across domain/user docs: rbac design, permission audit, config waive templates, role overview and leader user guide.
- smart-verify failed: Biome formatting in `packages/db/src/permissions/preset-roles.ts`. Next: adjust formatting to match Biome, rerun smart-verify.
- Fixed Biome formatting in preset roles (material permissions inline, ROLE_PRIORITY expanded).
- smart-verify passed (biome check, db:generate, check-types).
- Role model uses isSystem flag; comment says system preset roles cannot be deleted. Role assignments cascade on delete, so deleting role removes assignments.
