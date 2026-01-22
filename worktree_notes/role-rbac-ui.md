---
type: worktree_note
createdAt: "2026-01-22T08:23:55.239Z"
branch: "role-rbac-ui"
baseRef: "origin/main"
task:
  title: "Role permission refinement + role management UI updates"
  triageNote: "Remove old role-based logic; update role-management/user-management UI; keep permissions as-is"
---

# role-rbac-ui - Role permission refinement + role management UI updates

## Scope
- Goal: Remove old role-based logic, refine role permission UX, update role/user management UI for material/trace roles.
- Non-goals: Add new permission points; redesign navigation IA; data migration for legacy roles.
- Risks: Hidden role assumptions in UI may block role assignment or permissions.

## Slices
- [ ] Slice 0: worktree note context
- [ ] Slice 1: audit old role-based checks; replace with permission-based logic
- [ ] Slice 2: role management UI updates (roles list/labels, hints)
- [ ] Slice 3: user management UI binding validation for material/operator

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T08:23:55.239Z
- BaseRef: origin/main
- CommitsAheadOfBase: 15
- Dirty: true
- ChangedFiles:
  - apps/server/scripts/seed-demo.ts
  - apps/server/scripts/seed.ts
  - apps/server/scripts/smt-demo-dataset.ts
  - apps/server/scripts/test-mes-flow.ts
  - apps/web/src/components/login-form.tsx
  - apps/web/src/lib/constants.ts
  - conversation/2026-01-22_121824_mes-next_triage_2026-01-22.md
  - domain_docs/mes/CONTEXT.md
  - domain_docs/mes/permission_audit.md
  - domain_docs/mes/plan/tasks.md
  - domain_docs/mes/spec/config/samples/smt_a_waive_permission_matrix.yaml
  - domain_docs/mes/spec/config/templates/waive_permission_matrix.template.yaml
  - domain_docs/mes/spec/process/compair/smt_form_collection_matrix_user_confirmed.md
  - domain_docs/mes/spec/rbac/01_role_permission_design.md
  - packages/db/src/permissions/preset-roles.ts
  - user_docs/00_role_overview.md
  - user_docs/05_leader.md
  - user_docs/05_material.md
  - user_docs/07_trace.md
  - user_docs/demo/acceptance_plan_dip.md
  - user_docs/demo/guide.md
  - user_docs/sop_degraded_mode.md
  - worktree_notes/main.md
  - worktree_notes/role-redesign-v2.md
- Next:
  - Commit worktree note: git add worktree_notes/role-rbac-ui.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Deprecated role deletion only (no hiding); no new permission points for loading unlock/replace.

## Open Questions
- None.

## Progress
- Worktree created; ready to audit role-based logic and UI updates.
- Added server-side binding validation for line/station requirements.
- Expanded system role presets and added role binding validation in user dialog.
- smart-verify passed (biome check, db:generate, check-types).
- Synced with main and re-ran `bun scripts/smart-verify.ts` (pass).

## Findings
- Role management UI only sorts by isSystem; no role-specific ordering or hints.
- User dialog tooltips still reference leader; no validation for material/operator bindings.
- Meta roles API returns only id/code/name, so binding rules must map by role code.
- User management presets only include admin/planner/operator (missing quality/material/trace).
- No remaining leader references in apps/packages after updates.

## Errors
- Biome formatting failure in `apps/server/src/modules/users/service.ts` (binding validation call needs single-line format).
- web check-types failed: `formSchema` reference left in `user-dialog.tsx` (fixed to baseFormSchema).
- Audited role-based logic: no remaining leader references; backend role service uses isSystem guard only.
- Generalized binding validation messages/tooltips to cover custom roles with scoped data.
- smart-verify passed after binding message updates.
- Found smt-basic-wp4-10 merge commit: 1e2da31. Will inspect its file changes for permission impacts.
- smt-basic merge files not present in current worktree; need to inspect via git show from merge parent (cd6acdd).
- smt-basic routes (cd6acdd) use READINESS_VIEW for list and READINESS_CHECK for create (stencil/squeegee/equipment/oven), QUALITY_OQC for daily QC + production exceptions. No new permission points added.
