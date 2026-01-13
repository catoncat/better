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

### Slice 2: Run→Execution 深链接 (3.4.3.2) ✅ DONE
- [x] `$runNo.tsx:331-345` "开始执行/试产执行" 按钮 → `/mes/execution?runNo=xxx&woNo=yyy`
- [x] `execution.tsx:155-167` 接收 search params 并预填表单
- [x] **新增 PREP 状态支持**：PREP 状态显示"试产执行"，AUTHORIZED/IN_PROGRESS 显示"开始执行"

### Slice 3: Execution 待执行 runs 列表 (3.4.3.3) ✅ DONE (已实现)
- [x] `execution.tsx:324-376` 有"待执行批次"卡片，显示 5 个 runs
- [x] 列表包含 AUTHORIZED/PREP/IN_PROGRESS 状态的 runs
- [x] 点击 run 自动预填 TrackIn/TrackOut 表单

### Slice 4: Demo guide Unit 生成路径说明 (3.4.3.4) ✅ DONE
- [x] 在 guide.md 2.4 节补充说明 Unit 生成的两种路径
- [x] 添加对比表格说明适用场景

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-13T08:15:00.000Z
- BaseRef: origin/main
- CommitsAheadOfBase: 2
- Dirty: false
- ChangedFiles: (none)
- Next:
  - Slice 1: Demo guide dry run 验证（需要启动服务实际测试）
<!-- AUTO:END status -->

## Decisions
- ✅ PREP 状态需要"试产执行"按钮（已实现）
- ✅ "待执行批次"列表已满足需求，无需增强
- ✅ Unit 生成说明已补充到 demo guide

## Commits
1. `bc5a76f` docs(worktree): add M3 3.4.3 UX hardening task context
2. `cf2f299` feat(mes): add trial execution button for PREP status + document Unit generation paths

## Open Questions
- (已解决) PREP 状态是否需要"开始执行"按钮？→ 是，显示为"试产执行"
