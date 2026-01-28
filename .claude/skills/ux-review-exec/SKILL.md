---
name: ux-review-exec
description: 'MES 产品交互/UX 系统性 review 的“轮次执行”助手：按 Round + Scope 产出 `domain_docs/mes/ux_review/roundN_*.md`（交互矩阵 + 问题清单 + 建议），并更新 `domain_docs/mes/ux_review/00_status.md`。严格禁止修改 `.claude/skills/**` 与 ux_review 的 meta 模板/Backlog。'
---

# UX Review Exec（轮次执行）

## Goal

把 MES 产品交互 review 变成可复用、可追踪的执行产出：
- 每轮一个 `roundN_*.md`：覆盖范围、交互矩阵、问题清单、建议
- 同步更新 `00_status.md`：轮次状态/Owner/Updated/Links

### 优先级（裁决顺序）
业务逻辑通顺 > 功能规划合理 > UX > UI

---

## Non-Negotiables（硬约束）

### ✅ 默认允许写入/新增
- `domain_docs/mes/ux_review/round*_*.md`
- `domain_docs/mes/ux_review/00_status.md`
- `domain_docs/mes/ux_review/99_high_risk_findings.md`（可选）
- `.scratch/`（可选：中间草稿，不入 Git）

### 🚫 默认禁止修改（避免跑偏）
- `.claude/skills/**`
- `domain_docs/mes/ux_review/ux_review_tasks.md`
- `domain_docs/mes/ux_review/00_review_method.md`
- `domain_docs/mes/ux_review/00_interaction_matrix_template.md`
- `domain_docs/mes/ux_review/00_review_backlog.md`

> 若用户要求改方法/模板/Backlog：停止执行，改用 `ux-review-meta`。

---

## Inputs（必须明确）

用户必须提供：
1) **轮次**：如“轮次1 / 轮次2”
2) **Scope**：从 `domain_docs/mes/ux_review/00_review_backlog.md` 选一个条目（默认只做一个 scope）
3) **Owner（可选）**：写入 `00_status.md`，未提供则 `-`

文件命名规则（固定）：
- `domain_docs/mes/ux_review/round{N}_{scopeSlug}.md`
- `scopeSlug` 使用小写 snake_case（示例：`round1_core_execution.md`、`round2_routing_ia.md`）

---

## Workflow（执行步骤）

### Step 1) 收集证据入口（最小集）

按以下顺序读最少文件：
1. `domain_docs/mes/ux_review/00_review_backlog.md`：拿到本轮 scope 的 UI/API/文档入口
2. 业务逻辑基线：
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`
   -（必要时）`domain_docs/mes/spec/process/02_state_machines.md`
3. API 与权限事实：
   - `domain_docs/mes/tech/api/01_api_overview.md`
   - `domain_docs/mes/permission_audit.md`
4. 前端实现证据：
   - `apps/web/src/routes/_authenticated/mes/**`（页面与关键组件）

> 每读 2 个证据文件，就把发现写进本轮 `roundN_*.md`（不要只在聊天里）。

### Step 2) 生成/更新 `roundN_*.md`

- 不存在就用 `domain_docs/mes/ux_review/round1_template.md` 创建
- 必填：
  - 轮次目标（1 句话）
  - 覆盖范围（用户旅程/页面/角色）
  - 输入证据（Spec/API/Permission/UI 路径）

### Step 3) 填交互矩阵（核心产出）

使用 `00_interaction_matrix_template.md` 的列，至少覆盖：
- happy path（主线闭环）
- 至少 3 个异常路径（权限不足、数据为空、API 报错/校验失败）

每行必须包含可点击的证据（文件路径/路由/API endpoint）。

### Step 4) 产出问题清单（按优先级排序）

问题必须按四层优先级标注归属：
1. 业务逻辑通顺（状态/门禁/闭环/死路/不一致）
2. 功能规划合理（信息架构/入口/职责边界/重复功能）
3. UX（信息密度/反馈/可发现性/错误提示/效率）
4. UI（视觉一致性/组件使用/排版）

建议每条包含：
- Severity：P0/P1/P2
- 复现步骤（或触发条件）
- 期望 vs 现状（一句话）
- 建议修复方向（不写实现级细节也可以）
- 责任归属：前端/后端/文档/产品定义（可多选）

### Step 5) 更新 `00_status.md`

更新对应轮次一行：
- Scope：本轮 scope
- Status：`in_progress` 或 `completed`
- Owner：用户给的 owner 或 `-`
- Updated：当天日期（YYYY-MM-DD）
- Links：写 `domain_docs/mes/ux_review/roundN_*.md`

### Step 6)（可选）高风险误导点 `99_high_risk_findings.md`

满足任一即记录：
- 关键主线无法闭环（会卡死/误操作）
- 权限/门禁错误导致“无权限可操作/有权限不可用”
- 错误/空态导致用户走错流程（高概率）

---

## Output Standard（验收标准）

一轮执行合格的最低标准：
- `roundN_*.md` 至少 8 行交互矩阵
- 问题清单至少 5 条（含 1 条 P0 或明确说明“无 P0”）
- `00_status.md` 已更新并带 Links

