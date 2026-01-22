# Deprecated role cleanup decision

## Context
- 用户询问废弃角色是否应删除而非隐藏。
- 角色模型含 `isSystem` 标记（注释：系统预置角色不可删除）。
- Role 与 UserRoleAssignment 为级联删除（onDelete: Cascade）。

## Decisions
- 废弃角色应删除，不仅仅隐藏。
- 不拆分“上料解锁/换料”权限点（按推荐：继续沿用 loading:config + loading:verify）。

## Plan
- 在代码层移除废弃预置角色（已去掉 leader）。
- 在 seed/迁移逻辑中删除旧角色记录，并提供角色迁移策略说明（若线上存在 leader 需先重新分配）。
- 角色管理 UI 不再显示废弃角色；如遇历史遗留，提示需迁移。

## Findings
- 删除 Role 会级联删除用户角色绑定（UserRoleAssignment），需先迁移角色再删除。

## Progress
- None (decision recorded).

## Errors
- None.

## Open Questions
- 若线上仍有 leader 用户，需要指定迁移映射（material + planner/quality 组合）。

## References
- `packages/db/prisma/schema/schema.prisma`
- `packages/db/src/permissions/preset-roles.ts`
