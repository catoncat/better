# MES 文档系统性 Review — Meta 任务清单

> 状态：草案（待确认）
> 更新时间：2026-01-28
> 目标：建立“文档为真源”的系统性 Review 机制（Meta 拆解 + 模板 + 批次规则），作为后续细拆与执行的输入。

---

## 0. 角色与定位

- 本文档只定义 **Meta 任务拆解**（规则、模板、批次策略与产出结构）。
- 不直接列“实现级任务”、不直接判定具体文档/页面/接口的对错。
- 后续细拆由 `/next` 或其他协作者基于本清单继续完成。

---

## 1. 真源层级（裁决规则）

1. 一级：`domain_docs/mes/spec/`
2. 二级：`domain_docs/mes/dip_playbook/`、`domain_docs/mes/smt_playbook/`
3. 三级：`user_docs/`

> 冲突处理：以高层级文档为准，低层级文档必须修正或显式标注偏差。

---

## 2. 驱动入口（Review 主线）

- **API 驱动**：以 API 合约与实现为主线，向上回查文档，向下对齐 UI。
- 原因：API 是系统真实行为的最稳定载体，能减少角色文档偏差对 Review 的误导。

---

## 3. 最小 Review 单元（功能点）

每个功能点必须可映射：
- 文档位置（spec / playbook / user_docs）
- API 接口（路径、字段、契约）
- UI 位置（页面/组件/路由）

并输出：
- 对齐矩阵（文档 ↔ API ↔ UI）
- 偏差类型：缺失 / 命名不一致 / 行为不一致 / 未实现
- 修复责任：文档 / API / UI / 暂缓

---

## 4. 交付物结构（Meta 级）

统一落在：`domain_docs/mes/doc_review/`

- `00_review_method.md`：Review 方法与规则（真源层级、对齐顺序、证据记录规范）
- `00_alignment_matrix_template.md`：对齐矩阵模板
- `00_review_backlog.md`：API 驱动的功能点清单（不含实现级任务）
- `batchX_*.md`：批次对齐矩阵与偏差清单（执行阶段产出）
- `99_high_risk_findings.md`：高风险误导点汇总（执行阶段产出）
- `00_status.md`：共享进度状态（批次/高风险偏差追踪）

---

## 5. 批次划分策略（不锁定具体模块）

- 以 API 域为划分维度（示例：Trace / Loading / Execution / Quality / Runs / Routes）。
- 优先级由 **风险、频率、影响面** 共同决定。
- 批次顺序由执行者在细拆阶段再确认，不在此文档锁死。

---

## 6. Meta 任务清单

### T-DR-0 方法与模板
- T-DR-0.1 定义 Review 方法文档（真源层级、对齐顺序、记录规范）
- T-DR-0.2 定义对齐矩阵模板

### T-DR-1 Backlog 入口
- T-DR-1.1 从 API 合约抽取功能点清单（建立文档↔API↔UI索引）
- T-DR-1.2 建立批次拆分规则与优先级矩阵（不锁死批次顺序）

### T-DR-2 批次执行（由细拆承接）
- T-DR-2.x 批次对齐矩阵与偏差清单（每批次一个文档）
- T-DR-2.y 高风险误导点汇总

---

## 7. 与现有工作流的关系

- 本文档 **不属于 /next 任务来源**，避免干扰开发任务拆分。
- 运行时拆分与协作仍应写入 `.scratch/task-queue.md`（不入 Git）。
- Doc Review 的共享进度状态以 `domain_docs/mes/doc_review/00_status.md` 为准（可提交）。

---

## 8. 下一步（由执行者细拆）

- 根据 T-DR-0/T-DR-1 产出模板与 Backlog。
- 基于 Backlog 决定批次顺序并进入 T-DR-2。
