---
type: worktree_note
createdAt: "2026-01-22T10:07:07.382Z"
branch: "fix-role-bindings"
baseRef: "origin/main"
task:
  title: "Role binding validation alignment"
  planPath: "Slice 1: server schema/service require roleIds"
  planItem: "Slice 2: UI binding validation by dataScope"
---

# fix-role-bindings - Role binding validation alignment

## Scope
- Goal: align role binding validation by dataScope and remove server-side default-role fallback by requiring roleIds on create.
- Non-goals: change permissions model or role presets; adjust existing role assignments.
- Risks: API clients relying on default operator role will now receive validation errors unless roleIds provided.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: server schema/service require roleIds on create (remove default fallback)
- [ ] Slice 2: UI binding validation based on role dataScope

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T10:07:07.383Z
- BaseRef: origin/main
- CommitsAheadOfBase: 41
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
  - worktree_notes/role-rbac-ui.md
  - worktree_notes/role-redesign-v2.md
  - worktree_notes/smt-gap-track-a.md
- Next:
  - Commit worktree note: git add worktree_notes/fix-role-bindings.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Require roleIds on create to remove default operator fallback.
- UI binding validation should follow role dataScope, not hardcoded role codes.

## Open Questions
- None (proceed per user request 1+2).

## Findings
- `apps/server/src/modules/users/schema.ts` currently makes `roleIds` optional on create/update.
- `apps/web/src/hooks/use-users.ts` uses `client.api.meta.roles.get()` for role options; need to inspect meta roles response to see if dataScope is available for UI validation.
- `apps/server/src/modules/meta/index.ts` roles meta endpoint currently returns only id/code/name; need dataScope for UI validation.
- No existing `minItems` usage found in server schemas; may need to rely on manual validation or accept empty array checks in service.

## Progress
- Updated user create schema to require `roleIds` (minItems: 1); update schema forbids empty list when provided.
- Removed default role fallback in create; returns `ROLE_REQUIRED` when roles missing.
- Meta roles endpoint now includes `dataScope` for UI validation.
