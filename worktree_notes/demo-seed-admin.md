---
type: worktree_note
createdAt: "2026-01-28T10:41:00.928Z"
branch: "demo-seed-admin"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "admin demo seed endpoint + UI"
touchPoints:
  - "apps/server"
  - "apps/web"
  - "packages/db"
---

# demo-seed-admin - admin demo seed endpoint + UI

## Scope
- Goal: 增加管理员可控的演示数据生成入口（API + UI），支持选择数据集与覆盖/追加模式。
- Non-goals: 不改现有业务逻辑与演示数据内容本身（除非为幂等/覆盖策略做适配）。
- Risks: 覆盖会清空数据；需要权限与环境保护；部分脚本需移除 import 副作用。

## Findings
- 后端 `apps/server/src/modules/system/routes.ts` 已有系统设置模块，适合新增 `/system/demo-seed` 接口并复用审计逻辑。
- 现有 demo seed 脚本在 `apps/server/scripts/*`，包含 `seed.ts`、`seed-demo.ts`、`seed-loading-config.ts`、`seed-dc-demo.ts`；部分文件顶层执行/加载 dotenv，需要改造成可被服务端调用。
- MES 主数据已有可复用模块：`apps/server/src/modules/mes/seed/seed-mes-master-data.ts`（upsert + compile routes）。

## Slices
- [ ] Slice 0: worktree note context
- [ ] Slice 1: backend schema + routes skeleton for demo seed
- [ ] Slice 2: backend service + seed refactor (scripts -> callable)
- [ ] Slice 3: UI settings card + dialog (dataset selection + mode)
- [ ] Slice 4: polish (permissions, audit, docs)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T10:41:00.929Z
- BaseRef: origin/main
- CommitsAheadOfBase: 5
- Dirty: true
- ChangedFiles:
  - apps/web/src/components/chat/chat-assistant.tsx
  - apps/web/src/components/chat/chat-input.tsx
  - apps/web/src/components/chat/chat-messages.tsx
  - apps/web/src/components/chat/chat-suggestions.tsx
  - worktree_notes/fix_chat-scroll.md
- Next:
  - Commit worktree note: git add worktree_notes/demo-seed-admin.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- 权限：仅具备专用权限的管理员可执行（新增 `system:demo_seed`）。
- 运行保护：仅在 `ALLOW_DEMO_SEED=true` 环境允许执行。
- 模式：追加为默认；覆盖会清空数据库并重新生成（UI 强提醒）。
- UI 放置：系统设置页新增“演示数据”卡片。

## Open Questions
-
