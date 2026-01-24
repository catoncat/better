---
type: worktree_note
createdAt: "2026-01-22T10:08:16.411Z"
branch: "feat/reflow-profile"
baseRef: "origin/main"
task:
  title: "T2.5 + T2.6: ReflowProfile 模型与程式一致性校验"
  planPath: "Phase 2 Track D - 炉温程式管理"
---

# feat/reflow-profile - T2.5 + T2.6: ReflowProfile 模型与程式一致性校验

## Scope
- Goal: 实现炉温程式管理（ReflowProfile），支持程式定义、版本管理、使用记录，以及生产前的程式一致性校验
- Non-goals: 设备数采接入（Phase 3）、温度曲线实时监控
- Risks: RoutingStep 扩展可能影响现有路由配置

## Slices
- [x] Slice 1: ReflowProfile 模型设计（Schema + Migration）
- [x] Slice 2: ReflowProfile CRUD API + ReflowProfileUsage 记录
- [x] Slice 3: RoutingStep 扩展 expectedProfileId + 一致性校验 Service
- [x] Slice 4: Readiness 集成 PROGRAM 检查项 + 前端展示

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-22T10:08:16.412Z
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
  - Commit worktree note: git add worktree_notes/feat_reflow-profile.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- ReflowProfile 使用简化的 zoneConfig JSON 字段存储温区配置
- 程式一致性检查通过 PREP_PROGRAM 集成到 Readiness 系统
- RoutingStep.expectedReflowProfileId 关联期望程式

## Completed
- All slices completed and committed
- Ready for merge to main

## Open Questions
- (None - Track D complete)
