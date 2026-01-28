---
name: doc-review-meta
description: "MES 文档系统性 review 的 meta 任务拆解、模板/方法维护与共享进度状态。用于制定/更新 doc review 计划与追踪方案。"
---

# Doc Review Meta

## 适用场景

- 需要建立或调整“文档为真源”的系统性 review 方案
- 需要定义/更新 review 模板、方法论、批次策略
- 需要维护共享进度状态（可提交、可追踪）

## 工作流对齐（必须遵守）

- **Plan 文档为持久化真源**：写在 `domain_docs/mes/plan/` 或其子目录。
- **运行时切片**：写在 `.scratch/task-queue.md`（不入 Git）。
- **2-Action Rule**：每 2 次搜索/阅读后，把关键结论写回文档。

## 入口文件（先读）

- `domain_docs/mes/doc_review/doc_review_tasks.md`（meta 任务清单）
- `domain_docs/mes/doc_review/00_status.md`（共享进度状态）

## AskUsertools（必须使用）

当用户触发本技能时，先读取入口文件，再用 `request_user_input` **确认意图**，避免误改。

### 意图判定（先自动判断，尽量少问）

按用户话术关键词自动推断：\n
- **任务/清单/计划/拆解/模板** → 目标为“生成/更新 review 任务清单或模板”（改 `doc_review_tasks.md` 或模板）\n
- **进度/状态/推进/完成/卡住** → 目标为“维护共享进度”（改 `00_status.md`）\n
- **规则/方法/流程** → 目标为“更新规则/方法”（改 `doc_review_tasks.md` 或方法论说明）

若仍不明确，只问 **1 个**问题：

```
你要我做哪一类动作？
A 生成/更新 review 任务清单
B 维护 review 进度状态
C 更新规则/方法或模板
```

确认后再动手修改。

## 交互原则（避免“用户不知道改什么”）

- **任何确认/二选一前必须给出“拟更新内容清单”**，清单至少包含：
  - 具体文件路径
  - 具体字段/段落将被如何改动（示例值）
- **首次运行默认初始化**也必须说明将写入的内容，不能只说“更新两个文件”。\n
- **不要引入未解释的占位符**（如 B1/B2）。若文件里已有占位符，必须说明它只是“占位批次”，不代表已定义范围。
- **提问时用用户语言**：不要直接念 B1/B2 之类内部编号，一律说“批次”；只有在“拟更新内容清单”里才展示编号。

### 确认示例（标准格式）

```
拟更新内容：
1) domain_docs/mes/doc_review/doc_review_tasks.md
   - 状态：草案（待确认）→ 已确认
   - 更新时间：改为今天
2) domain_docs/mes/doc_review/00_status.md
   - Updated：改为今天
   - Notes：新增“初始化”

请确认是否按上述内容更新（是/否）
```

## 共享状态方案（标准）

- **唯一共享状态文件**：`domain_docs/mes/doc_review/00_status.md`
- **更新时机**：
  - 批次状态变化（pending/in_progress/completed）
  - 高风险偏差新增/关闭
- **字段要求**：Batch、Scope、Status、Owner、Updated、Notes、Links

## Meta 任务执行模板

1) **对齐/校验 meta 规则**
- 确认真源层级（spec → playbook → user_docs）
- 确认 API 驱动入口

2) **维护 meta 产出结构**
- 若缺少模板/方法/Backlog 文档，先补齐再继续
- 修改时同步更新 `doc_review_tasks.md`

3) **共享状态维护**
- 每次更新批次或风险项后，写入 `00_status.md`
- 若涉及运行时切片，写入 `.scratch/task-queue.md`

4) **记录关键决策**
- 若产生流程/规则变更，用 `bun scripts/conversation-new.ts` 生成 note

## 不做的事（保持 meta 边界）

- 不创建实现级任务或修复项
- 不判定某个页面/接口/文档的具体正确性
- 不锁死批次顺序（除非用户明确要求）
