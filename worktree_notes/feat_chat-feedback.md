---
type: worktree_note
createdAt: "2026-01-28T05:45:46.148Z"
branch: "feat/chat-feedback"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "Chat feedback collection (local)"
touchPoints:
  - "apps/web/src/components/chat"
  - "apps/server/src/modules/chat"
  - "packages/db"
---

# feat/chat-feedback - Chat feedback collection (local)

## Scope
- Goal: 在聊天面板为每条 assistant 回复提供反馈入口，打包“问题+回答+上下文”发送到新端点；落地到新表。
- Non-goals: 不做满意度/评分；不做后台反馈列表。
- Risks: 反馈弹窗用浏览器 prompt，交互较轻量。

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: Prisma schema + migration (chat_feedback)
- [x] Slice 2: Server feedback endpoint
- [x] Slice 3: Web UI feedback button + payload

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T05:45:46.148Z
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
  - Commit worktree note: git add worktree_notes/feat_chat-feedback.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- 收集入口：每条 assistant 回复下方按钮
- 存储：新增 chat_feedback 表
- 字段：不包含满意度，仅问题/回答/路径/会话/可选备注
- 端点：POST /api/chat/feedback

## Errors
- 2026-01-28: 首次 `db:migrate` 生成空 migration（schema 尚未包含 ChatFeedback）。下一步：删除空 migration 目录并重新生成。

## Progress
- 重新补回空 migration 文件以匹配已应用记录，并生成新的 `chat_feedback_create` 迁移。

## Open Questions
-
