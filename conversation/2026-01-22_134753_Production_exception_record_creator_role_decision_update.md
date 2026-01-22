# Production exception record creator role decision update

## Context
- 用户确认：工艺工程师负责路由管理；管理员不参与业务决策；无班组长角色。
- 生产异常记录（ProductionExceptionRecord）需要明确“谁创建/谁确认/谁关闭”。

## Decisions
- 未决：待用户确认创建与确认的角色分工（见 Open Questions）。

## Plan
- 给出角色选项、影响与推荐（默认推荐：操作员发起 + 质量确认/关闭）。
- 用户确认后，再更新 SMT Gap 设计建议与计划中的职责描述。

## Findings
- 系统预置角色：admin / planner / engineer / quality / leader / operator。
- 质量工程师具有 QUALITY_OQC / QUALITY_DISPOSITION 等权限，适合异常处理。
- 操作员具备执行现场权限，适合作为异常上报入口。

## Progress
- 已同步用户角色约束（无 leader、engineer/admin 不参与业务）。

## Errors
- None.

## Open Questions
- 生产异常记录由谁创建？推荐：操作员发起 + 质量确认/关闭；备选：质量直接创建/关闭。

## References
- `packages/db/src/permissions/preset-roles.ts`
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
