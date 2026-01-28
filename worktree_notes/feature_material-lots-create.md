---
type: worktree_note
createdAt: "2026-01-28T05:45:33.861Z"
branch: "feature/material-lots-create"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "mes/material-lots create"
touchPoints:
  - "apps/web"
---

# feature/material-lots-create - mes/material-lots create

## Scope
- Goal: 物料批次列表页支持新增记录（批次号 + 物料）。
- Non-goals: 权限控制/复杂字段（IQC、供应商等）暂不处理。
- Risks: 需要确认后端创建接口与字段名/校验规则。

## Slices
- [ ] api
- [ ] ui

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T05:45:33.862Z
- BaseRef: origin/main
- CommitsAheadOfBase: 14
- Dirty: true
- ChangedFiles:
  - "conversation/2026-01-28_123028_AI_Chat_\345\273\272\350\256\256\346\250\241\345\236\213\344\270\216\350\267\257\345\276\204\351\223\276\346\216\245.md"
  - apps/server/.env.example
  - apps/server/src/modules/chat/config.ts
  - apps/server/src/modules/chat/routes.ts
  - apps/server/src/modules/chat/service.ts
  - apps/server/src/modules/chat/system-prompt.ts
  - apps/server/src/modules/chat/tools.ts
  - apps/web/src/components/chat/chat-assistant.tsx
  - apps/web/src/components/chat/chat-history.tsx
  - apps/web/src/components/chat/chat-messages.tsx
  - apps/web/src/components/chat/chat-suggestions.tsx
  - apps/web/src/components/chat/route-context.ts
  - apps/web/src/components/chat/use-chat-history.ts
  - apps/web/src/components/chat/use-chat.ts
  - apps/web/src/components/chat/use-suggestions.ts
  - apps/web/src/components/ui/dialog.tsx
  - apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx
  - apps/web/src/routes/_authenticated/system/settings.tsx
  - conversation/2026-01-28_124441_chat-assistant_dialog_overlay_click_issue.md
  - conversation/2026-01-28_131715_chat_history_local_storage_ui_plan.md
  - fly.toml
  - worktree_notes/feat_run-detail-ux-cta.md
  - worktree_notes/main.md
- Next:
  - Commit worktree note: git add worktree_notes/feature_material-lots-create.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- 使用新 worktree + 分支实现（feature/material-lots-create）。
- 先做最小可用创建：批次号 + 物料即可提交。

## Open Questions
- 后端创建接口是否存在、字段命名/必填规则是什么？

## Findings
- material-lot 模块当前只有 list/get/patch/usage；无 create endpoint 或 schema。
- Prisma `MaterialLot` 仅 `materialCode` + `lotNo` 必填，且组合唯一。
- `mes/material-lots` 现有页面只有编辑对话框；Header 可扩展按钮（DataListLayout 直接渲染 `header`）。
