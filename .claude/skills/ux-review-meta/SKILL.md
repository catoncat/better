---
name: ux-review-meta
description: 'MES 产品交互/UX 系统性 review 的 meta 助手：定义 review 方法与模板、生成/维护 review Backlog、维护共享进度状态（`domain_docs/mes/ux_review/`）。不做轮次执行产出（roundN_*.md），执行请用 ux-review-exec。'
---

# UX Review Meta（MES 产品交互 Review）

## 目标

建立“可持续的交互/体验 review 机制”，让后续的 UI/UX 整理不再靠临时记忆或一次性大改，而是：
- 有明确的 review 优先级与裁决规则
- 有可追踪的范围清单（Backlog）
- 有共享进度状态（Round/Owner/Updated）
- 轮次执行产出由 `ux-review-exec` 承接

### 优先级（不可颠倒）

业务逻辑通顺 > 功能规划合理 > UX > UI

---

## 边界（重要）

- 本 skill 只做 **meta 层**：方法/模板/Backlog/状态维护。
- 轮次执行（写 `roundN_*.md`、填对齐矩阵、列问题清单、产出建议）：请用 `ux-review-exec`。
- 不在这里做“实现级修复”，也不把修复项写进 MES 开发 Plan（那是后续 /dev 或 /next 的事）。

---

## 真源与证据（裁决顺序）

当交互/流程描述冲突时，按以下优先级裁决并记录证据：
1. `domain_docs/mes/spec/`（流程/状态机/路由引擎）
2. `domain_docs/mes/tech/api/`（API 合约/概览）
3. 运行时权限与展示策略：`domain_docs/mes/permission_audit.md`
4. 前端实际实现：`apps/web/src/routes/_authenticated/mes/`（页面/组件/交互）
5. 演示/用户文档：`user_docs/`

---

## 入口文件（先读）

- `domain_docs/mes/ux_review/ux_review_tasks.md`（meta 任务清单）
- `domain_docs/mes/ux_review/00_review_method.md`（方法与评审准则）
- `domain_docs/mes/ux_review/00_interaction_matrix_template.md`（交互矩阵模板）
- `domain_docs/mes/ux_review/00_review_backlog.md`（范围清单）
- `domain_docs/mes/ux_review/00_status.md`（共享进度状态）

---

## 默认交互（只问关键问题）

### 意图识别

- **任务/清单/Backlog/范围/初始化** → 更新 `00_review_backlog.md` / `ux_review_tasks.md`
- **进度/状态/轮次/Owner** → 更新 `00_status.md`
- **方法/模板/准则/打分/规则** → 更新 `00_review_method.md` / `00_interaction_matrix_template.md`
- **执行/对齐/round/产出** → 交给 `ux-review-exec`（本 skill 不执行）

### 默认模式（用户只输入 `$ux-review-meta` 或“做 MES 交互 review”但没给 scope）

1) 读取现有 `domain_docs/mes/ux_review/` 是否已初始化  
2) 给出“拟更新内容清单”（文件路径 + 改动点）  
3) 只问一句：是否执行（是/否）

---

## 产出要求（meta）

任何修改都必须能落到以下一个或多个文件：
- 规则/准则：`00_review_method.md`
- 模板：`00_interaction_matrix_template.md`、`round1_template.md`
- 范围清单：`00_review_backlog.md`
- 共享状态：`00_status.md`（如表格包含 `Commits` 列，必须同步维护：用短 hash 记录本次变更对应的 git commit，必要时按 `review → fix/close` 形式写两段）
