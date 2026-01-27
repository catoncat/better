---
type: worktree_note
createdAt: "2026-01-27T08:09:34.802Z"
branch: "user-docs-demo-split"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "拆分演示文档为产线+功能阶段结构"
  planPath: "创建 smt/01-05, dip/01-02, appendix/* 文件，从 guide.md 迁移内容"
---

# user-docs-demo-split - 拆分演示文档为产线+功能阶段结构

## Scope
- Goal: 将单一的 guide.md (1000+ 行) 拆分为按产线+功能阶段组织的多个文档
- Non-goals: 不修改功能代码，仅文档重组
- Risks: 无

## Slices
- [x] Slice 0: 创建目录结构和索引文件 (README.md, 01_overview.md, 02_preparation.md)
- [x] Slice 1: 创建 SMT 准备阶段文档 (smt/01_prep_phase.md)
- [x] Slice 2: 创建 SMT FAI 阶段文档 (smt/02_fai_phase.md)
- [x] Slice 3: 创建 SMT 执行阶段文档 (smt/03_exec_phase.md)
- [x] Slice 4: 创建 SMT 收尾阶段文档 (smt/04_closeout_phase.md)
- [x] Slice 5: 创建 SMT 异常处理文档 (smt/05_exception.md)
- [x] Slice 6: 创建 DIP 全流程文档 (dip/01_full_flow.md)
- [x] Slice 7: 创建 DIP 异常处理文档 (dip/02_exception.md)
- [x] Slice 8: 创建附录文件 (appendix/*.md)
- [x] Slice 9: 提交并验证

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T08:25:00.000Z
- BaseRef: origin/main
- MergedAt: 2026-01-27T08:25:00.000Z
- MergedTo: main
- Next:
  - ✅ All slices completed and merged to main
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-
