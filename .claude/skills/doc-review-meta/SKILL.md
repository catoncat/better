---
name: doc-review-meta
description: "MES 文档系统性 review 的 meta 助手：任务清单/Backlog/模板/方法与共享状态维护。不负责轮次对齐执行（roundN_*.md）；执行请用 doc-review-exec。"
---

# Doc Review Meta

## 适用场景

- 需要建立或调整“文档为真源”的系统性 review 方案
- 需要生成/更新 review 任务清单（meta 级）
- 需要维护共享进度状态（可提交、可追踪）

## 边界（重要）

- 本 skill（meta）：维护方法/模板/Backlog/共享状态占位，并输出“拟更新内容清单”。
- 轮次执行（写 `roundN_*.md`、填对齐矩阵、列偏差清单、把某轮次状态置为 in_progress/completed）：请使用 `doc-review-exec`。

## 工作流对齐（必须遵守）

- **Plan 文档为持久化真源**：写在 `domain_docs/mes/doc_review/`。
- **运行时切片**：写在 `.scratch/task-queue.md`（不入 Git）。
- **2-Action Rule**：每 2 次搜索/阅读后，把关键结论写回文档。
- **AGENTS.md 强制读取**：若要求读取 `.scratch/`，必须读，但 **不对用户展示** 读写过程。

> 2-Action Rule 的“写回”优先落到目标文档（如 `doc_review_tasks.md` / `00_status.md`），避免额外创建新的 scratch 记录。

## 入口文件（先读）

- `domain_docs/mes/doc_review/doc_review_tasks.md`（meta 任务清单）
- `domain_docs/mes/doc_review/00_review_backlog.md`（功能点清单）
- `domain_docs/mes/doc_review/00_status.md`（共享进度状态）

## 交互设计（必须遵守）

### 1) 意图优先，不要反复追问

按用户话术自动判断意图：
- **任务/清单/计划/拆解/生成** → 生成/更新 review 任务清单（改 `doc_review_tasks.md` + `00_review_backlog.md`）
- **进度/状态/推进/完成/卡住** → 维护共享进度（改 `00_status.md`）
- **模板/结构/方法/规则/流程** → 更新规则/方法或模板（改 `00_review_method.md` / `00_alignment_matrix_template.md` / `doc_review_tasks.md`）
- **轮次/执行/对齐矩阵/偏差清单/roundN** → 使用 `doc-review-exec`（本 skill 不负责执行产出）

若用户明确要做轮次对齐但误触发本 skill：不要改 meta 文档，直接提示改用 `doc-review-exec`。

若意图仍不明确，只问 **1 个**问题（用户语言）：

```
你要我做哪一类动作？
A 生成/更新 review 任务清单
B 维护 review 进度
C 更新规则/方法或模板
```

**默认模式（首次运行或未给具体目标）**：
- 当用户仅输入 `$doc-review-meta` 或“做文档 review 任务+进度”但没有具体改动点，直接进入“生成 review 任务清单”流程。
- 仅给出一份“拟更新内容清单”，然后问“是否执行（是/否）”。不提供 A/B/C 选项，不进入“模板改动”路径。
- **禁止多选/深度选择类问题**（例如“更新深度/改模板/改结构”）；只问一句“是否执行（是/否）”。

### 2) 确认前必须给“拟更新内容清单”

任何确认/二选一前，必须先列出清单：
- 具体文件路径
- 具体字段/段落如何改动（示例值）
清单中对“轮次”一律用用户语言（如“轮次占位/轮次1-3”），不要直接写 B1/B2。

### 3) 首次运行默认初始化

若发现是首次运行（文件为空或为草案）：
- 不引入新概念、不展开轮次定义
- 只做“可用初始化”：生成/补齐模板 + 生成 Backlog 初始条目 + 确认任务清单状态 + 轮次占位保持 TBD

### 4) 只输出用户需要的信息

不要输出内部操作过程（例如 git status、协议说明等）。
如需读取 `.scratch/` 或写入 scratch note，请静默执行，不在回复中逐步播报。

### 5) 读取策略（降噪）

- 必须读取 `.scratch/`，但只读 **最少必要** 文件（优先读 `index.md` 或最近更新的 note）。
- **除非用户明确要求**，不要读取 `.scratch/task-queue.md`。
- 不要输出“耗时/进度/步骤说明”，直接给结论与拟更新清单。

---

## 输出与动作（简版）

- 任务清单 / Backlog：改 `doc_review_tasks.md` / `00_review_backlog.md`（不做实现级修复）。
- 方法/模板：只在用户明确要求“改规则/改模板”时，改 `00_review_method.md` / `00_alignment_matrix_template.md`。
- 共享状态：改 `00_status.md`（字段以文件内表头为准；轮次可保持占位 TBD）。
- 运行时切片：需要多人协作/并行时才写 `.scratch/task-queue.md`（不入 Git）。
- 关键决策：如确有流程/规则变更需要留档，用 `bun scripts/conversation-new.ts "<topic>" --persist` 写入 `conversation/` 并提交。

## 不做的事（保持 meta 边界）

- 不创建实现级任务或修复项
- 不判定某个页面/接口/文档的具体正确性
- 不锁死轮次顺序（除非用户明确要求）
- 不执行轮次对齐产出（`roundN_*.md`）——交给 `doc-review-exec`
