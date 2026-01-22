# Role redesign v2 planning

## Context
- 用户要求重新规划更好的角色设计（现有角色过旧）。
- 用户确认：工艺工程师只负责路由管理；管理员不参与业务决策；无班组长角色。
- 当前系统权限为原子权限（wo/run/exec/route/quality/readiness/loading/trace/system 等）。

## Decisions
- 待确认：角色设计的范围（仅 MES 还是全系统），以及实际组织岗位清单。

## Plan
- 输出角色设计原则（职责、权限、数据范围、绑定关系）。
- 提出候选角色集合 + 权限矩阵 + 数据范围建议。
- 请求用户确认组织岗位与业务边界后，再落地到文档目录与实现计划。

## Findings
- 现有权限点定义在 `packages/db/src/permissions/permissions.ts`，可用于角色矩阵。
- 现有预置角色包含 admin/planner/engineer/quality/leader/operator；用户明确不使用 leader。

## Progress
- 创建角色重构讨论笔记，等待用户确认关键问题。

## Errors
- None.

## Open Questions
- 角色设计范围：仅 MES 业务？是否覆盖系统管理/集成？
- 真实组织中有哪些岗位（生产计划、质量、物料、设备、工艺、仓库等）？
- 是否需要区分“录入/确认/审批/豁免”的多级职责？

## References
- `packages/db/src/permissions/permissions.ts`
- `packages/db/src/permissions/preset-roles.ts`
