---
type: worktree_note
createdAt: "2026-01-22T10:31:11.358Z"
branch: "smt-gap-track-e-stencil-squeegee-readiness"
baseRef: "origin/main"
task:
  title: "Track E: 钢网清洗/刮刀点检 Readiness"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "2.7.4+2.8.4"
touchPoints:
  - "apps/server/src/modules/mes/readiness/service.ts"
  - "apps/server/src/modules/mes/readiness/routes.ts"
---

# smt-gap-track-e-stencil-squeegee-readiness - Track E: 钢网清洗/刮刀点检 Readiness

## Scope
- Goal:
- Non-goals:
- Risks:

## Slices
- [ ] PREP_STENCIL_CLEAN readiness
- [ ] PREP_SCRAPER readiness

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T10:31:11.359Z
- BaseRef: origin/main
- CommitsAheadOfBase: 45
- Dirty: true
- ChangedFiles:
  - apps/server/scripts/seed-demo.ts
  - apps/server/scripts/seed.ts
  - apps/server/scripts/smt-demo-dataset.ts
  - apps/server/scripts/test-mes-flow.ts
  - apps/server/src/modules/mes/fai/routes.ts
  - apps/server/src/modules/mes/fai/schema.ts
  - apps/server/src/modules/mes/fai/service.ts
  - apps/server/src/modules/mes/line/schema.ts
  - apps/server/src/modules/mes/run/service.ts
  - apps/server/src/modules/meta/index.ts
  - apps/server/src/modules/users/schema.ts
  - apps/server/src/modules/users/service.ts
  - apps/web/src/components/login-form.tsx
  - apps/web/src/hooks/use-fai.ts
  - apps/web/src/hooks/use-readiness.ts
  - apps/web/src/lib/constants.ts
  - apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx
  - apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx
  - apps/web/src/routes/_authenticated/system/role-management.tsx
  - apps/web/src/routes/_authenticated/system/user-management.tsx
  - conversation/2026-01-22_161310_Role_permission_refinement__role_management_UI_plan.md
  - conversation/2026-01-22_162004_Deprecated_role_cleanup_decision.md
  - conversation/2026-01-22_163309_Role_RBAC_UI_refinement_execution.md
  - conversation/2026-01-22_170611_smt-basic_merge_permissions_check.md
  - conversation/2026-01-22_173543_role_redesign_start.md
  - conversation/2026-01-22_182008_role_binding_validation_alignment.md
  - domain_docs/mes/permission_audit.md
  - domain_docs/mes/plan/smt_gap_task_breakdown.md
  - domain_docs/mes/plan/tasks.md
  - domain_docs/mes/spec/config/samples/smt_a_waive_permission_matrix.yaml
  - domain_docs/mes/spec/config/templates/waive_permission_matrix.template.yaml
  - domain_docs/mes/spec/rbac/01_role_permission_design.md
  - packages/db/prisma/schema/migrations/20260122090535_add_fai_signature_fields/migration.sql
  - packages/db/prisma/schema/schema.prisma
  - packages/db/src/permissions/preset-roles.ts
  - user_docs/00_role_overview.md
  - user_docs/05_leader.md
  - user_docs/05_material.md
  - user_docs/07_trace.md
  - user_docs/demo/acceptance_plan_dip.md
  - user_docs/demo/guide.md
  - user_docs/sop_degraded_mode.md
  - worktree_notes/feat_fai-sign-ui.md
  - worktree_notes/feat_fai-signature.md
  - worktree_notes/fix-role-bindings.md
  - worktree_notes/role-rbac-ui.md
  - worktree_notes/role-redesign-v2.md
  - worktree_notes/smt-gap-track-a.md
- Next:
  - Commit worktree note: git add worktree_notes/smt-gap-track-e-stencil-squeegee-readiness.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-
