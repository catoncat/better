# MES 文档索引

> **更新时间**: 2026-01-27

## 里程碑定义

| 里程碑 | 说明 |
|--------|------|
| M1~M1.8 | ERP 路由同步、MES 执行闭环、体验优化、RBAC |
| M2 | 质量控制与授权闭环（FAI、OQC、缺陷处置、MRB、返修 Run） |
| M3 | 上线准备（可重复验收、部署运维、数据采集配置、文档/培训） |
| M4 | 自动化/批量 Ingest、设备自动 Track-in/out、回传 |

## 阅读路径

| 目的 | 文档 |
|------|------|
| 当前验收（SMT） | `user_docs/demo/acceptance_plan_smt.md` |
| 当前验收（DIP） | `user_docs/demo/acceptance_plan_dip.md` |
| 验收问题跟踪 | `user_docs/demo/acceptance_issues.md` |
| 了解 M4 进度/待办 | `plan/phase4_tasks.md` |
| 了解 SMT Gap 当前任务 | `plan/smt_gap_task_breakdown.md` |
| 了解 M3 已交付范围 | `plan/tasks.md` |
| 了解历史进度（M2） | `plan/archive/phase2_tasks.md` |
| 了解全局流程 | `spec/process/01_end_to_end_flows.md` |
| 了解 SMT 流程 | `spec/process/03_smt_flows.md` |
| 了解 DIP 流程 | `spec/process/04_dip_flows.md` |
| 查找节点对应实现 | `spec/impl_align/` |

## Triage（接下来做什么）

- DIP 验收脚本已完成（`user_docs/demo/acceptance_plan_dip.md`），无阻断问题。
- SMT 验收计划已创建（`user_docs/demo/acceptance_plan_smt.md`），待执行验收。
- SMT Gap 任务已基本完成，详见 `plan/smt_gap_task_breakdown.md`。
- M4 开发以 `plan/phase4_tasks.md` 为参考，当前重点是 P0 验收标准确认。
- 使用 `/next` skill 进行任务分拣（会输出 worktree scan + 候选项 + 冲突提示）。

## 流程定义

- `spec/process/01_end_to_end_flows.md` - 端到端流程
- `spec/process/02_state_machines.md` - 状态机定义
- `spec/process/03_smt_flows.md` - SMT 产线流程
- `spec/process/04_dip_flows.md` - DIP 产线流程

## 实现对齐

- `spec/impl_align/01_e2e_align.md` - 端到端闭环节点实现映射
- `spec/impl_align/03_smt_align.md` - SMT 节点实现映射
- `spec/impl_align/04_dip_align.md` - DIP 节点实现映射

## 架构设计

- `spec/architecture/01_product_abstraction.md` - **产品化通用技术方案**（通用模型设计、迁移策略）

## 任务追踪

- `plan/01_milestones.md` - 里程碑概览
- `plan/smt_gap_task_breakdown.md` - SMT Gap 任务分解（已基本完成）
- `user_docs/demo/acceptance_plan_smt.md` - SMT 验收计划
- `user_docs/demo/acceptance_plan_dip.md` - DIP 验收计划（已完成脚本验收）
- `user_docs/demo/acceptance_issues.md` - 验收问题跟踪
- `plan/phase4_tasks.md` - M4 当前任务分解（参考）
- `plan/tasks.md` - M3 上线准备（已完成）
- `plan/archive/phase2_tasks.md` - M2 历史任务（已完成）
