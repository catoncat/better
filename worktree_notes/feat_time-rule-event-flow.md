---
type: worktree_note
createdAt: "2026-01-24T06:30:01.772Z"
branch: "feat/time-rule-event-flow"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "Time Rule 事件流（Plan A）"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "T2.9–T2.13"
---

# feat/time-rule-event-flow - Time Rule 事件流（Plan A）

## Scope
- Goal: 落地 Plan A 事件流（DB 事件表 + 30s 轮询）替换 TimeRule 硬编码触发。
- Non-goals: 不引入外部队列/消息中间件；不改 UI；不调整规则定义业务含义。
- Risks: 事件码来源分散、幂等边界不清、轮询负载与延迟不稳。

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: 事件表模型 + 索引 + 迁移（T2.9）
- [ ] Slice 2: 事件发射（TrackIn/TrackOut/锡膏使用）（T2.10）
- [ ] Slice 3: 事件处理器（30s 轮询、幂等、重试 10 次指数退避）（T2.11）
- [ ] Slice 4: TimeRule 触发改为事件驱动（T2.12）
- [ ] Slice 5: 事件保留与清理任务（30 天）（T2.13）

## Findings
- main 本地分支领先 origin/main（需确认是否先合并 feat/smt-gap-time-rules）

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T06:30:01.773Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Plan A：DB 事件表 + 30s 轮询
- 事件粒度 A（TRACK_IN / TRACK_OUT / SOLDER_PASTE_USAGE_CREATE + payload）
- 保留期 30 天；重试 10 次 + 指数退避

## Open Questions
- 事件发射点是否已有统一事件中心可复用（待盘点）
