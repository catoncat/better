# Role permission refinement + role management UI plan

## Context
- 角色体系已更新为 admin / planner / engineer / quality / material / operator / trace。
- 目标是进一步细化权限边界，并同步角色管理 UI 行为与提示。

## Decisions
- 默认不新增权限点，仅通过现有权限点做更细的角色映射与 UI gating。
- 若后续需要拆分“上料解锁/替换”等高风险动作，再新增权限点。

## Plan
- 权限细化（角色 → 权限 → 数据范围 → 页面入口）
  1) 校准权限矩阵：核对关键动作（批次授权/收尾、准备检查/豁免、上料验证、执行采集、追溯导出）。
  2) 页面入口与操作 gating：/mes/runs, /mes/loading, /mes/execution, /mes/trace 等依据权限显示/禁用。
  3) 数据范围绑定：material 需 line 绑定；operator 需 station 绑定；UI 显示必填提示。
  4) 审计与追溯：确保运行授权、准备豁免、上料验证均保留角色与操作者。
- 角色管理 UI（/system/role-management & /system/user-management）
  1) 角色列表名称/描述更新与排序（隐藏废弃角色）。
  2) 用户分配角色时，显示数据范围与绑定要求提示。
  3) 新增校验：material 未绑定产线、operator 未绑定工位时，保存前提示或阻止。
  4) 角色权限说明 tooltip：展示关键权限范围（如 planner 可授权/关闭）。
- 迁移与验证
  1) 为历史 leader 用户提供一次性映射策略（leader → material + planner/quality 视实际分工）。
  2) 更新 demo/test 脚本及演示账号说明。
  3) 运行 smart-verify 验证。

## Findings
- 现有权限点足以覆盖角色边界（run/readiness/loading/exec/trace），无需立刻新增权限点。

## Progress
- None (plan only).

## Errors
- None.

## Open Questions
- 是否要新增“上料解锁/替换”的独立权限点（从 loading:config 拆出）？

## References
- `packages/db/src/permissions/permissions.ts`
- `apps/web/src/routes/_authenticated/system/role-management.tsx`
- `apps/web/src/routes/_authenticated/system/user-management.tsx`
