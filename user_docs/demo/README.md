# MES 系统演示指南

> 本目录包含 MES 系统的演示文档，面向演示人员、销售和客户。

## 文档索引

### 快速入门

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [01_overview.md](./01_overview.md) | 系统概览、核心概念、状态速查 | 演示前必读 |
| [02_preparation.md](./02_preparation.md) | 环境准备、数据准备、账号说明 | 演示环境搭建 |

### SMT 产线演示

| 文档 | 说明 | 预计时间 |
|------|------|----------|
| [smt/01_prep_phase.md](./smt/01_prep_phase.md) | 工单创建、准备记录、Readiness、上料 | 10-15 分钟 |
| [smt/02_fai_phase.md](./smt/02_fai_phase.md) | FAI 创建、试产、判定、签字 | 5-10 分钟 |
| [smt/03_exec_phase.md](./smt/03_exec_phase.md) | 授权、批量执行、数据采集 | 10-15 分钟 |
| [smt/04_closeout_phase.md](./smt/04_closeout_phase.md) | 收尾、OQC、MRB、追溯验证 | 5-10 分钟 |
| [smt/05_exception.md](./smt/05_exception.md) | 失败分支与恢复路径 | 可选 |

### DIP 产线演示

| 文档 | 说明 | 预计时间 |
|------|------|----------|
| [dip/01_full_flow.md](./dip/01_full_flow.md) | DIP 全流程演示（简化版） | 15-20 分钟 |
| [dip/02_exception.md](./dip/02_exception.md) | DIP 失败分支与恢复 | 可选 |

### 附录

| 文档 | 说明 |
|------|------|
| [appendix/accounts.md](./appendix/accounts.md) | 演示账号列表 |
| [appendix/demo_data.md](./appendix/demo_data.md) | 推荐演示数据 |
| [appendix/error_codes.md](./appendix/error_codes.md) | 错误码速查表 |
| [appendix/checkpoints.md](./appendix/checkpoints.md) | 验证检查点清单 |

### 验收文档

| 文档 | 说明 | 状态 |
|------|------|------|
| [acceptance_plan_smt.md](./acceptance_plan_smt.md) | SMT 验收计划 | 待验收 |
| [acceptance_plan_dip.md](./acceptance_plan_dip.md) | DIP 验收计划 | 已完成 |
| [acceptance_issues.md](./acceptance_issues.md) | 验收问题记录 | - |

---

## 快速演示路径

### 30 分钟 SMT 全流程

```
01_overview.md (5分钟)
    ↓
smt/01_prep_phase.md (10分钟)
    ↓
smt/02_fai_phase.md (5分钟)
    ↓
smt/03_exec_phase.md (5分钟)
    ↓
smt/04_closeout_phase.md (5分钟)
```

### 15 分钟快速演示

只演示核心路径：
1. 工单创建 → Run 创建
2. Readiness 检查（跳过详细准备记录）
3. FAI 快速通过
4. 批量执行 2-3 个 Unit
5. 追溯查询展示

### 按角色演示

| 角色 | 重点章节 |
|------|----------|
| 计划员 | `01_prep_phase.md` 的工单/Run 部分 |
| 操作员 | `01_prep_phase.md` 的上料 + `03_exec_phase.md` |
| 质量 | `02_fai_phase.md` + `04_closeout_phase.md` |
| 工程师 | `01_overview.md` 的配置说明 |

---

## 技术参考

- SMT 技术手册：`domain_docs/mes/smt_playbook/`
- DIP 技术手册：`domain_docs/mes/dip_playbook/`
- 端到端流程规范：`domain_docs/mes/spec/process/`
