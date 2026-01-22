---
type: worktree_note
createdAt: "2026-01-22T09:50:54.932Z"
branch: "smt-gap-p2-timerule"
baseRef: "origin/main"
task:
  title: "Phase 2 Track C: TimeRule 时间规则引擎设计与实现"
  planPath: "T2.1 TimeRule 模型设计 → T2.2 规则监控后台 → T2.3/T2.4 具体规则"
  triageNote: "Track C: T2.1-T2.4"
touchPoints:
  - "packages/db/prisma/schema/schema.prisma, apps/server/src/modules/mes/time-rule/, apps/web/src/routes/_authenticated/mes/time-rules/"
---

# smt-gap-p2-timerule - Phase 2 Track C: TimeRule 时间规则引擎设计与实现

## Scope
- Goal:
- Non-goals:
- Risks:

## Slices
- [ ] T2.1:模型设计, T2.2:监控后台, T2.3:锡膏规则, T2.4:水洗规则

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T09:50:54.933Z
- BaseRef: origin/main
- CommitsAheadOfBase: 40
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
  - Commit worktree note: git add worktree_notes/smt-gap-p2-timerule.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-

## 2025-01-22 - TimeRule cron permission check fix

Context:
- Update time-rule cron supervisor permission check to avoid substring matching on JSON.

Findings:
- apps/server/src/plugins/time-rule-cron.ts uses role.permissions.includes("READINESS_OVERRIDE"), which is substring matching on JSON string; should parse JSON or reuse userHasAnyPermission.

Plan:
- Switch cron permission check to use userHasAnyPermission helper or JSON parse.

Findings (perm fix):
- apps/server/src/lib/permissions.ts exports userHasAnyPermission(db, userId, permissions: string[]) helper that parses role permissions JSON.
- Plan: use userHasAnyPermission for supervisor filtering in time-rule cron to avoid JSON substring matching.

Errors:
- apply_patch failed updating apps/server/src/plugins/time-rule-cron.ts (path resolved to /Users/envvar/lzb/better/... not in worktree). Next: retry with absolute path in worktree.

Progress:
- Added roleHasPermission helper in time-rule cron and replaced substring check for READINESS_OVERRIDE.

Errors:
- conversation note write failed due to noclobber (file exists). Next: overwrite with >| or use tee.

Findings (docs lookup):
- rg in domain_docs/mes found time rule references in smt_gap_task_breakdown and compair docs; phase3_tasks.md missing in worktree (sed error).

Findings (plan files):
- domain_docs/mes/plan has tasks.md and smt_gap_task_breakdown.md; phase3_tasks.md not present.
- tasks.md has no TimeRule mentions (rg returned no matches).

Findings (align/plan):
- Track C tasks for TimeRule are in domain_docs/mes/plan/smt_gap_task_breakdown.md with all subtask checkboxes unchecked.
- No TimeRule references found in domain_docs/mes/spec/impl_align/*. Need to add mapping.

Findings (process spec):
- spec/process/03_smt_flows.md readiness item list does not include TIME_RULE; update needed for accuracy.
- spec/impl_align/03_smt_align.md lacks time-rule nodes; add mappings for time rule checks/waive/definitions.

Findings (config templates):
- domain_docs/mes/spec/config/templates/time_rule_config.template.yaml exists; consider whether T2.1.5 should be marked complete.

Findings (acceptance checklist):
- Phase 2 acceptance checklist includes "锡膏暴露超 24h 自动 Alert" and "水洗时间规则按路线生效" checkboxes that should be marked done.

Findings (emoji check):
- rg -nP "\\p{Extended_Pictographic}" domain_docs/mes returned existing emoji in plan and dip_playbook files (pre-existing). Requires decision on cleanup.

Progress:
- Updated SMT flow note, align table, and Track C/Phase 2 acceptance checklists in smt_gap_task_breakdown.
- bun scripts/smart-verify.ts passed (biome check, db:generate, check-types).
