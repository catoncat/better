---
name: demo-qa
description: '演示过程中的快速问答助手。用于快速查阅演示文档、SMT/DIP playbook、前端路由，回答演示相关问题（如"SMT 怎么上料"、"DIP 流程是什么"、"FAI 页面在哪"）。只读操作，不修改代码。'
context: fork
trigger_examples:
  positive:
    - "演示问题"
    - "演示怎么做"
    - "如何演示"
    - "demo 怎么操作"
    - "SMT 怎么上料"
    - "SMT 流程"
    - "DIP 怎么操作"
    - "DIP 流程"
    - "FAI 在哪"
    - "上料页面"
    - "工位执行怎么演示"
    - "演示账号"
    - "演示数据"
    - "异常处理怎么演示"
    - "OQC 怎么做"
    - "怎么切换产线"
    - "路由是什么"
  negative:
    - "帮我实现 XXX" # → dev
    - "修改代码" # → dev
    - "下一步做什么" # → next
    - "做到哪了" # → worktree-status
---

# Demo QA - 演示快速问答助手

## Goal

在产品演示过程中，快速查阅相关文档并回答问题。这是一个只读助手，不修改任何代码或文档。

## 文档索引

### 演示文档 (user_docs/demo/)
| 文件 | 用途 |
|-----|------|
| `README.md` | 演示文档总索引 |
| `01_overview.md` | 系统概览、核心概念 |
| `02_preparation.md` | 演示前准备 |
| `guide.md` | UI 演示操作指南 |
| `smt/` | SMT 产线演示步骤 (准备、FAI、执行、收尾、异常) |
| `dip/` | DIP 产线演示步骤 (全流程、异常) |
| `appendix/` | 演示账号、数据、错误码、检查点 |
| `acceptance_plan_smt.md` | SMT 验收计划 |
| `acceptance_plan_dip.md` | DIP 验收计划 |

### SMT Playbook (domain_docs/mes/smt_playbook/)
| 文件/目录 | 用途 |
|-----|------|
| `00_scope_and_terms.md` | SMT 术语、角色、实体映射 |
| `01_data_sources_and_ownership.md` | 数据来源与管理 |
| `02_configuration/` | 产线、槽位、物料、路由、产品配置 |
| `03_run_flow/` | 端到端运行流程 (工单、备料、上料、FAI、执行、OQC、异常) |
| `04_demo_data/` | 演示数据蓝图与脚本 |
| `05_validation/` | 验证清单 |
| `99_appendix/` | 实体表映射、API/UI 索引、条码规则 |

### DIP Playbook (domain_docs/mes/dip_playbook/)
| 文件/目录 | 用途 |
|-----|------|
| `00_scope_and_terms.md` | DIP 术语、角色 (与 SMT 差异) |
| `01_data_sources_and_ownership.md` | 数据来源与管理 |
| `02_configuration/` | 产线、工位、物料、工装、路由、检验配置 |
| `03_run_flow/` | 端到端运行流程 (插件、波峰焊、后焊、FAI/IPQC、测试、OQC) |
| `04_demo_data/` | 演示数据蓝图与脚本 |
| `05_validation/` | 验证清单 |
| `99_appendix/` | 实体表映射、API/UI 索引、工装管理 |

### 前端路由 (apps/web/src/routes/_authenticated/)
| 路由 | 用途 |
|-----|------|
| `index.tsx` | 仪表盘/首页 |
| `mes/index.tsx` | MES 模块入口 |
| `mes/loading/` | 上料验证页面 |
| `mes/fai.tsx` | 首件检验页面 |
| `mes/execution.tsx` | 工位执行页面 |
| `mes/routes.tsx` | 生产路由管理 |
| `mes/$routingCode.tsx` | 路由详情 (动态路由) |
| `system/` | 系统管理 (用户、审计日志) |
| `profile.tsx` | 用户资料 |

## Workflow

1. **理解问题**: 确定问题类型
   - 操作类: "怎么做 XXX"
   - 位置类: "XXX 在哪"
   - 概念类: "XXX 是什么"
   - 数据类: "演示账号/数据是什么"

2. **定位文档**: 根据问题类型选择最小文档集
   - SMT 相关 → `user_docs/demo/smt/` + `domain_docs/mes/smt_playbook/03_run_flow/`
   - DIP 相关 → `user_docs/demo/dip/` + `domain_docs/mes/dip_playbook/03_run_flow/`
   - UI 位置 → `apps/web/src/routes/_authenticated/` + `user_docs/demo/guide.md`
   - 账号/数据 → `user_docs/demo/appendix/`
   - 概念/术语 → `*/00_scope_and_terms.md`

3. **快速查阅**: 读取 1-3 个最相关的文件

4. **简洁回答**:
   - 直接回答问题 (不要绕圈子)
   - 给出具体步骤或位置
   - 引用文档路径供深入查阅

## 快速问答模板

### 操作类问题
```
**操作步骤**:
1. 步骤一
2. 步骤二
3. ...

**UI 路径**: /mes/loading → ...
**详情参考**: `user_docs/demo/smt/03_execution.md`
```

### 位置类问题
```
**UI 路径**: /mes/fai
**文件**: `apps/web/src/routes/_authenticated/mes/fai.tsx`
**操作指南**: `user_docs/demo/guide.md` 第 X 节
```

### 概念类问题
```
**定义**: ...
**在系统中的作用**: ...
**参考**: `domain_docs/mes/smt_playbook/00_scope_and_terms.md`
```

## Guardrails

- **只读**: 不修改任何文件、不执行任何写操作
- **快速**: 目标是 <30 秒内给出答案
- **聚焦**: 只回答演示相关问题，其他请求转发到合适的 skill
- **实用**: 给出可直接操作的步骤，而非抽象描述

## 常见问题速查

### Q: 演示账号是什么？
→ 查阅 `user_docs/demo/appendix/` 中的账号文档

### Q: SMT 上料怎么演示？
→ 查阅 `user_docs/demo/smt/02_loading.md` 或相应的上料文档

### Q: FAI 页面在哪？
→ UI 路径 `/mes/fai`，文件 `apps/web/src/routes/_authenticated/mes/fai.tsx`

### Q: DIP 和 SMT 有什么区别？
→ 查阅 `domain_docs/mes/dip_playbook/README.md` 中的对比表

### Q: 异常处理怎么演示？
→ 查阅 `user_docs/demo/smt/05_exceptions.md` 或 `user_docs/demo/dip/02_exceptions.md`
