---
type: worktree_note
createdAt: "2026-01-13T07:58:25.289Z"
branch: "feat/m3-ux-hardening"
baseRef: "origin/main"
task:
  title: "M3 3.4.3 UX Hardening"
  planPath: "完成 Track A 的 4 个子任务：demo guide dry run 验证、Run→Execution 深链接、Execution 待执行 runs 列表、demo guide Unit 生成路径说明"
touchPoints:
  - "apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx"
  - "apps/web/src/routes/_authenticated/mes/execution.tsx"
  - "user_docs/demo/guide.md"
---

# feat/m3-ux-hardening - M3 3.4.3 UX Hardening

## Scope
- Goal: 改进 MES 演示/执行流程的用户体验，确保 go-live 前操作员体验流畅
- Non-goals: 新增业务功能、修改后端 API
- Risks: 低 - 纯前端/文档改动

## Slices

### Slice 1: Demo guide dry run 验证 (3.4.3.1)
- [ ] 按 guide.md 2.1-2.8 步骤逐项验证流程可走通
- [ ] 修正发现的不准确描述

### Slice 2: Run→Execution 深链接验证 (3.4.3.2)
- [x] **已实现**: `$runNo.tsx:331-343` "开始执行" 按钮 → `/mes/execution?runNo=xxx&woNo=yyy`
- [x] **已实现**: `execution.tsx:155-167` 接收 search params 并预填表单
- [ ] 验证当前行为是否满足需求（AUTHORIZED/IN_PROGRESS 状态才显示按钮）
- [ ] 评估是否需要在 PREP 状态也显示（试产场景）

### Slice 3: Execution 待执行 runs 列表增强 (3.4.3.3)
- [x] **已实现**: `execution.tsx:324-376` 有"待执行批次"卡片，显示 5 个 runs
- [ ] 评估是否需要增加分页或筛选功能
- [ ] 验证从列表选择 run 后表单预填是否正确

### Slice 4: Demo guide Unit 生成路径说明 (3.4.3.4)
- [ ] 在 guide.md 中补充说明 Unit 生成的两种路径：
  1. TrackIn 时自动创建（首次扫入新 SN）
  2. Run 详情页"生成单件"按钮（预生成批量 SN）
- [ ] 说明何时使用哪种方式

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-13T08:05:00.000Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: false
- ChangedFiles:
  - worktree_notes/feat_m3-ux-hardening.md
- Next:
  - Slice 1: 开始 demo guide dry run 验证
<!-- AUTO:END status -->

## Decisions
- Run→Execution 深链接已实现，只需验证行为
- "待执行批次"列表已实现，评估是否需要增强

## Open Questions
- PREP 状态是否需要"开始执行"按钮？（试产场景下可能需要）
