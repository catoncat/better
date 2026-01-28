---
type: worktree_note
createdAt: "2026-01-28T04:19:08.830Z"
branch: "feat/run-detail-ux-cta"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "Run Detail readiness CTA UX"
touchPoints:
  - "apps/web/src/routes/_authenticated/mes/runs/.tsx"
---

# feat/run-detail-ux-cta - Run Detail readiness CTA UX

## Scope
- Goal: 统一 readiness CTA、修复 runNo 丢失、让“下一步”可点击、授权按钮门控、模板卡片区分未启用。
- Non-goals: 不改后端/接口，不新增页面与实体。
- Risks: CTA 入口权限/过滤参数不一致导致误跳；需确保仅 PREP 可操作。

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: 统一 CTA 生成 + 表格替换
- [ ] Slice 2: nextAction 主 CTA + 授权门控 + 模板卡片“未启用”

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T04:19:08.830Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - .dockerignore
  - "conversation/2026-01-28_120829_AI_Chat_\347\224\237\344\272\247\351\205\215\347\275\256.md"
  - agent_docs/05_ops/single_binary_deployment.md
  - apps/server/.env.example
  - apps/server/src/modules/chat/service.ts
  - apps/server/src/modules/chat/tools.ts
  - apps/web/src/components/chat/chat-messages.tsx
  - Dockerfile
  - fly.toml
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- 主 CTA 位置：保留右上角按钮区，只把“流程进度/下一步”做成可点击 CTA。
- PREP_FIXTURE 入口：`/mes/maintenance-records?entityType=FIXTURE&lineId=...`。
- TIME_RULE 入口：仅跳 `/mes/time-rules`，不预置 ruleType。

## Findings
- Run Detail 页内已有 readiness CTA 分支与模板卡片逻辑，适合集中到统一函数并在原位替换。

## Open Questions
- 无
