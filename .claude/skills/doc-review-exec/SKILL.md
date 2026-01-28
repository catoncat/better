---
name: doc-review-exec
description: 'MES 文档系统性 review 的“执行”助手。用于按“轮次 + API 域”产出对齐矩阵与偏差清单（Doc ↔ API ↔ UI），并更新 `domain_docs/mes/doc_review/00_status.md`；严格禁止修改 `.claude/skills/**` 与 doc-review meta 模板。'
---

# Doc Review Exec（轮次执行）

## Goal

把“文档为真源”的 review 从 meta 规则落到**可追踪的执行产出**：
- 产出 `roundN_*.md`：对齐矩阵 + 偏差清单 + 证据链
- 更新 `00_status.md`：轮次状态/Owner/Updated/Links + Commits（把本轮产出/修复对应的 git commit 记录进去）

> 本 skill 只做 **review 执行记录**，默认不做“修文档/改实现”。修复属于后续开发/文档修订任务。

---

## Non-Negotiables（硬约束）

### ✅ 允许写入/新增（默认）
- `domain_docs/mes/doc_review/round*_*.md`（本轮次的执行产出）
- `domain_docs/mes/doc_review/00_status.md`（共享进度状态）
- `domain_docs/mes/doc_review/99_high_risk_findings.md`（可选：高风险误导点汇总）
- `.scratch/`（可选：中间草稿，不入 Git；除非用户明确要求）

### 🚫 禁止修改（除非用户明确要求做“meta/模板调整”或“文档修复”）
- `.claude/skills/**`（绝对禁止；避免“变成更新你自己的技能”）
- `domain_docs/mes/doc_review/doc_review_tasks.md`
- `domain_docs/mes/doc_review/00_review_method.md`
- `domain_docs/mes/doc_review/00_alignment_matrix_template.md`
- `domain_docs/mes/doc_review/00_review_backlog.md`（默认只读；需要改 Backlog 时由 doc-review-meta 处理）

---

## Inputs（必须明确）

用户提供（缺一则只问 1 个问题补齐）：
1) **轮次**：如“轮次1/轮次2/轮次3”（用用户语言，不写 B1/B2）
2) **Scope（API 域）**：从 `domain_docs/mes/doc_review/00_review_backlog.md` 里选 1 个（默认只做一个域）
3) **Owner**（可选）：写入 `00_status.md`，不提供则用 `-`

输出文件命名规则（固定，不再讨论）：
- `domain_docs/mes/doc_review/round{N}_{scope}.md`
- `scope` 使用 Backlog 中的域名小写 + 下划线（示例：`round1_loading.md`、`round1_readiness.md`）

---

## Workflow（按轮次执行，不做并行拆分）

### Step 1) 定位证据入口（最小集）

只读取必要文件，优先顺序：
1. `domain_docs/mes/doc_review/00_review_backlog.md`：拿到本域的 API/UI/文档入口
2. `domain_docs/mes/tech/api/01_api_overview.md`：确认接口列表（索引）
3. 相关合约/Playbook/Spec（按域选择 1~3 个）：
   - Execution / Gatekeeping：`domain_docs/mes/tech/api/02_api_contracts_execution.md`
   - Quality：`domain_docs/mes/tech/api/03_api_contracts_quality.md`
   - Trace：`domain_docs/mes/tech/api/04_api_contracts_trace.md`
   - SMT/DIP Playbook：`domain_docs/mes/*_playbook/**`
4. UI：`apps/web/src/routes/_authenticated/mes/` 下的页面文件 + 关键组件（用 `rg` 追踪到 `-components/`）

> 2-Action Rule（执行版）：每读 2 个文件，就把关键发现先写进本轮次 `roundN_*.md`（避免只在聊天里）。

### Step 2) 生成/打开轮次产出文件

- 若 `roundN_{scope}.md` 不存在：以 `domain_docs/mes/doc_review/round1_template.md` 为模板创建
- 填写以下字段（必须具体、可点击）：
  - **轮次目标**：一句话说明“本轮次要对齐什么、产出什么”
  - **覆盖范围**：API 域 / UI 页面（路径）/ 文档入口（路径）
  - **输入文档**：按真源层级列出具体 md 路径

### Step 3) 填对齐矩阵（必须有“证据链”）

对每个功能点行，必须写清：
- Doc：具体文件路径（必要时加小标题/章节名）
- API：endpoint（+ 关键字段/规则要点）
- UI：页面/组件路径
- 偏差类型：缺失 / 命名不一致 / 行为不一致 / 未实现
- 修复责任：文档 / API / UI / 暂缓

建议粒度（默认）：
- 每个 API 域至少 5 行功能点（不要只写 1 行“全域 TBD”）

### Step 4) 偏差清单（可执行，不开工）

在 “偏差清单” 里，用 checklist 形式列出：
- `Severity`：High / Medium / Low
- `证据`：Doc + API + UI（至少两项）
- `建议归属`：文档 / API / UI
- `下一步`：建议由哪个开发/文档任务承接（不在此 skill 内创建实现任务）

### Step 5) 更新共享状态 `00_status.md`

必须更新一行（对应轮次）：
- Scope：本轮次 scope（例如 Loading）
- Status：`in_progress` 或 `completed`
- Owner：用户给的 owner 或 `-`
- Updated：当天日期（YYYY-MM-DD）
- Commits：写本轮相关提交短 hash，格式：`<review>` → `<fix/close>`（示例：`de6519c` → `a99c9d5`）。若只完成 review 产出（尚未修复/关闭），右侧用 `-` 占位，后续补齐并更新该行。
- Links：填 `roundN_{scope}.md` 相对路径

### Step 6)（可选）高风险误导点 `99_high_risk_findings.md`

触发条件（满足其一就算高风险）：
- 文档宣称“可以/必须”但 API/UI 行为相反
- 权限/RBAC 描述与实际不一致导致“无权限可操作/有权限不可操作”
- 会引发数据完整性问题的关键流程误导（例如可跳过 gate、错误写入）

格式要求：每条包含 Scope、结论、证据链接（round 文档 + doc/api/ui）。

---

## Output Standard（交付标准）

最终交付必须满足：
- `roundN_{scope}.md` 中至少 5 行对齐矩阵（除非用户明确要求“只做快照/占位”）
- 每条偏差都有证据链（Doc/API/UI 至少两项）
- `00_status.md` 更新了对应轮次的 Scope/Status/Updated/Commits/Links（Commits 用短 hash，符合表头格式）
