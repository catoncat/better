---
type: worktree_note
createdAt: "2026-01-28T10:39:00.800Z"
branch: "feat/mes-routing-fai-template"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "SMT 路由管理 + FAI 模板绑定"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  triageNote: "SMT 路由自建 + FAI 模板绑定 + ERP 工单路由绑定"
---

# feat/mes-routing-fai-template - SMT 路由管理 + FAI 模板绑定

## Scope
- Goal: 支持 MES 自建 SMT 路由、FAI 模板绑定与门禁一致；ERP 工单同步可稳定绑定路由并允许覆盖。
- Non-goals: 不引入分支路由/条件跳过，不实现 IPQC。
- Risks: DB 迁移与路由快照字段变更涉及多模块，需小步提交。

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: 规格与计划对齐（routing/inspection/plan）
- [ ] Slice 2: DB Schema + Migration（FAI 模板 + 路由绑定）
- [ ] Slice 3: Server 路由/模板/门禁（API + 快照 + FAI items）
- [ ] Slice 4: ERP 工单路由解析与覆盖
- [ ] Slice 5: Web 管理与执行（模板管理/路由绑定/FAI 录入）
- [ ] Slice 6: 测试 + Align 文档

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T10:39:00.800Z
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
  - Commit worktree note: git add worktree_notes/feat_mes-routing-fai-template.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- 路由来源：SMT 使用 MES 自建路由；ERP 路由只读保留。
- FAI 形态：结构化模板。
- 绑定范围：路由级单一 FAI 模板（Run 级门禁）。

## Open Questions
-
