---
type: worktree_note
createdAt: "2026-01-28T06:21:37.204Z"
branch: "feat/fai-auto-formal"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "FAI 创建自动触发正式检查"
touchPoints:
  - "apps/server/src/modules/mes/fai/service.ts"
---

# feat/fai-auto-formal - FAI 创建自动触发正式检查

## Scope
- Goal: FAI 创建时自动触发 FORMAL 就绪检查，避免无正式检查导致阻塞演示。
- Non-goals: 不新增前端按钮，仅调整后端服务逻辑。
- Risks: FORMAL 失败仍会阻塞创建，需要用户处理失败项。

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: Server - auto formal readiness check in FAI create

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T06:21:37.204Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- 2026-01-28: FAI 创建逻辑若无 FORMAL 或未通过，则自动执行一次 FORMAL 检查。

## Open Questions
-

## Errors
- 2026-01-28: `bun scripts/smart-verify.ts` failed on Biome lint due to existing format/import issues in `apps/web/src/components/chat/chat-assistant.tsx` and `apps/web/src/components/chat/chat-messages.tsx` (unrelated to this change). No fixes applied.
