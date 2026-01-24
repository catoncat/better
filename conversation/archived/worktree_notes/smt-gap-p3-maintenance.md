---
type: worktree_note
createdAt: "2026-01-23T04:35:42.399Z"
branch: "smt-gap-p3-maintenance"
baseRef: "origin/main"
task:
  title: "T3.1 维修表单 - 设备/夹具维修记录与 Readiness 刷新"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "T3.1"
---

# smt-gap-p3-maintenance - T3.1 维修表单 - 设备/夹具维修记录与 Readiness 刷新

## Scope
- Goal: 实现设备/夹具维修记录功能，维修完成后自动刷新 Readiness 状态
- Non-goals: TPM 完整流程、维护计划排程
- Risks: 需确认维修记录与现有 Equipment/Fixture 模型的关联方式

## Slices
- [ ] 1. MaintenanceRecord 模型设计 (Prisma schema)
- [ ] 2. 维修 CRUD API (routes + service)
- [ ] 3. Readiness 刷新集成 (维修后触发 PREP_FIXTURE 等检查刷新)
- [ ] 4. 前端维修录入页面 (/mes/maintenance)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-23T04:35:42.400Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-
