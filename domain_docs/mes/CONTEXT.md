# MES 文档索引

> **更新时间**: 2026-01-08
> **状态**: M2 已落地，M3 进行中（上线准备）

## 里程碑概览

| 里程碑 | 状态 | 说明 |
|--------|------|------|
| M1~M1.8 | ✅ Done | ERP 路由同步、MES 执行闭环、体验优化、RBAC |
| M2 | ✅ Done | 质量控制与授权闭环（FAI、OQC、缺陷处置、MRB、返修 Run） |
| M3 | 🚧 In Progress | 上线准备（可重复验收、部署运维、数据采集配置、文档/培训） |
| M4 | 📋 Planned | 自动化/批量 Ingest、设备自动 Track-in/out、回传 |

## 阅读路径

| 目的 | 文档 |
|------|------|
| 了解 M3 进度/待办 | `plan/phase3_tasks.md` |
| 了解历史进度（M2） | `plan/phase2_tasks.md` |
| 了解全局流程 | `spec/process/01_end_to_end_flows.md` |
| 了解 SMT 流程 | `spec/process/03_smp_flows.md` |
| 了解 DIP 流程 | `spec/process/04_dip_flows.md` |
| 查找节点对应实现 | `spec/impl_align/` |

## 流程定义

- `spec/process/01_end_to_end_flows.md` - 端到端流程
- `spec/process/02_state_machines.md` - 状态机定义
- `spec/process/03_smp_flows.md` - SMT 产线流程
- `spec/process/04_dip_flows.md` - DIP 产线流程

## 实现对齐

- `spec/impl_align/01_e2e_align.md` - 端到端闭环节点实现映射
- `spec/impl_align/03_smp_align.md` - SMT 节点实现映射
- `spec/impl_align/04_dip_align.md` - DIP 节点实现映射

## 任务追踪

- `plan/01_milestones.md` - 里程碑概览
- `plan/phase3_tasks.md` - **M3 当前任务分解（进度主入口）**
- `plan/phase2_tasks.md` - M2 历史任务（已完成）
