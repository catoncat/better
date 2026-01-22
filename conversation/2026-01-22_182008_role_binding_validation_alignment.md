# Context
- 用户确认执行 1+2：
  1) UI 绑定校验改为基于角色 dataScope。
  2) API 侧移除默认角色回退，要求创建用户时必须提供 roleIds。

# Decisions
- userCreateSchema 强制 `roleIds`（minItems: 1），update 时若提供也不能空。
- createUser 不再 fallback 到 operator；无角色时返回 `ROLE_REQUIRED`。
- meta roles 响应补充 `dataScope` 供 UI 校验。
- User dialog 校验逻辑基于 dataScope，而非固定角色代码。

# Plan
- 已完成并合并到 main。

# Findings
- dataScope 只存在于 roles 表；之前 /meta/roles 未返回，需要补齐。

# Progress
- 服务端 schema/service 与 meta roles 更新完成。
- 前端 user dialog 校验已改为 dataScope。
- `bun scripts/smart-verify.ts` 通过。

# Errors
- 无。

# Open Questions
- 无。

# References
- `apps/server/src/modules/users/schema.ts`
- `apps/server/src/modules/users/service.ts`
- `apps/server/src/modules/meta/index.ts`
- `apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx`
- `worktree_notes/fix-role-bindings.md`
