# Phase 4 Plan (M4 - Ingest & Automation)

> 状态：草案（待确认范围）
> 更新时间：2026-01-24
> 目标：在不破坏 M3 上线默认"人工 TrackIn/TrackOut"的前提下，补齐 AUTO/BATCH/TEST 的 ingest 执行闭环，并为后续回传/自动化扩展提供稳定接口。

---

## 0. 前置条件（Acceptance 验收优先）

在开始本阶段开发前，当前最紧急任务是**跑全流程验收**（尤其前端集成/UI 操作链路），把阻断性问题收敛到可复现清单并修复/确认。

- 验收计划：`user_docs/demo/acceptance_plan.md`
- 验收计划（DIP）：`user_docs/demo/acceptance_plan_dip.md`
- 问题跟踪：`user_docs/demo/acceptance_issues.md`

**原则**：未完成验收（或仍存在 P0 阻断问题）时，不建议推进后续实现开发。

---

## 1. 范围约束

### 1.1 In-Scope（本期交付）

- **Ingest 事件接入**：支持 AUTO/BATCH/TEST 事件写入（幂等、可回放、可审计）
- **执行闭环**：基于 `ingestMapping` 将事件映射为执行结果（Tracks/CarrierTracks + DataValues + PASS/FAIL）
- **追溯覆盖**：Trace 可呈现"手工 Track"与"ingest 事件"来源，且与冻结 routeVersion snapshot 对齐
- **回归保护**：不影响既有 MANUAL TrackIn/TrackOut + 质量闭环（M2）与上线验收脚本（M3）

### 1.2 Non-Goals（后续/按需）

- 回传/outbound feedback：TBD，建议独立推进，避免阻塞 ingest 闭环
- 大规模报表/看板（BI/统计）
- 设备实时控制闭环（非 ingest 范畴）

---

## 2. 验收标准

P0（必须）：
- [ ] Ingest API 支持幂等（dedupeKey），重复上报不产生重复副作用
- [ ] AUTO/TEST step 能通过 ingestMapping 自动写入 DataValue，并产生可追溯的执行事件/结果
- [ ] Trace API 能展示 ingest 事件来源、映射后的结果、以及对应的 routeVersion（冻结）
- [ ] 现有 MANUAL 执行路径与 `bun apps/server/scripts/test-mes-flow.ts` 仍稳定通过（回归）

---

## 3. 任务清单

### 3.1 Ingest 合约定义

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.1.1 | 定义 IngestEvent 合约（字段、幂等键、来源系统、时间戳、payload 约束） | ✅ | - | |
| T4.1.2 | 定义/收敛 `ingestMapping` 结构（如何提取 sn/station/time/result/measurements） | ✅ | T4.1.1 | |
| T4.1.3 | 补充 M4 验收场景（AUTO/TEST 最小闭环；含回放/幂等/追溯断言） | ✅ | T4.1.1 | |

### 3.2 Ingest 存储与 API

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.2.1 | Schema: IngestEvent（持久化 + 索引 + 去重策略 + 必要关联） | ✅ | T4.1.1 | |
| T4.2.2 | Server: Ingest API（create + idempotency + validation + error taxonomy） | ✅ | T4.2.1 | |
| T4.2.3 | Service: raw persistence → normalize/dispatch（为后续执行/追溯留扩展点） | ✅ | T4.2.2 | |
| T4.2.4 | Trace: 事件可查询/可关联（最小字段回显，支持回放定位） | ✅ | T4.2.3 | |

### 3.3 AUTO/TEST 执行映射

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.3.1 | 执行映射：根据 routeVersion snapshot + ingestMapping 解析事件并定位 step/unit | ✅ | T4.2.3 | |
| T4.3.2 | 写入结果：生成 Track/CarrierTrack（如适用）+ DataValues + PASS/FAIL outcome | ✅ | T4.3.1 | |
| T4.3.3 | 门禁/一致性：station constraint / step mismatch / required data 校验与可定位错误 | ✅ | T4.3.2 | |
| T4.3.4 | Trace 聚合：trace 输出包含 ingest 事件与对应的执行结果/数据值 | ✅ | T4.3.3 | |

### 3.4 Readiness 配置（可选，P1）

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.4.1 | Readiness 配置模型与 API（开关/规则/默认值可配置） | ✅ | - | as-built: `/lines/:lineId/readiness-config` (`line.meta.readinessChecks.enabled`) |
| T4.4.2 | Web 配置页（工程师/管理员可操作；与权限/审计一致） | ✅ | T4.4.1 | as-built: `/mes/readiness-config` |

### 3.5 Outbound Feedback（TBD）

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.5.1 | 定义回传 payload 合约（完成/质量/追溯摘要；幂等键） | ✅ | - | as-built: `spec/integration/02_integration_payloads.md` (Outbound `RUN_COMPLETION_V1`) |
| T4.5.2 | Outbox/重试策略（失败回放、死信、审计） | ✅ | T4.5.1 | as-built: `MesEvent` outbox + retry API (`/api/integration/outbound/events`) |

### 3.6 SMT 追溯强化

> 基于 `compair/codex_smt_flow_deep_analysis.md` 的工作包拆分与验收要求，聚焦 SMT 追溯合规与表单电子化。
>
> **架构决策**：见 `conversation/2026-01-20_094100_MES产品化架构决策.md`
> - 现阶段按需硬编码（有复杂关联/查询需求时）
> - 纯表单采集优先考虑 DataCollectionSpec
> - 保留 `meta` 字段以备产品化时扩展

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.6.1 | 前置确认：表单字段对齐 + 时间窗口起止事件 + 数据来源确认 | ✅ | - | DoD：`smt_forms/*.md` 字段版本确认（已对齐确认表） |
| T4.6.2 | 时间窗口规则（WP-1）：可配置；超时提醒 + 可豁免 | ✅ | T4.6.1 | 软门禁，不强制阻断；REFLOW/AOI TrackOut → WASH TrackIn |
| T4.6.3 | 烘烤记录（WP-2） | ✅ | - | BakeRecord 数据结构 + UI 表单 |
| T4.6.3.1 | 烘烤记录联动与规则（WP-2 后续） | ✅ | T4.6.3 | as-built: Readiness `PREP_BAKE`（`apps/server/src/modules/mes/readiness/service.ts`） |
| T4.6.4 | 锡膏生命周期（WP-3） | ✅ | - | 解冻/回温/搅拌/领用/回收可追溯 |
| T4.6.4.1 | 锡膏记录联动（WP-3 后续） | ✅ | T4.6.4 | as-built: Readiness `PREP_PASTE` + TimeRule `SOLDER_PASTE_24H`（`apps/server/src/modules/mes/time-rule/*`） |
| T4.6.5 | 钢网/刮刀寿命（WP-4） | ✅ | - | 使用与点检记录落地 |
| T4.6.5.1 | 钢网/刮刀寿命联动（WP-4 后续） | ✅ | T4.6.5 | as-built: Readiness `PREP_STENCIL_USAGE`/`PREP_SCRAPER` 寿命阈值门禁（`apps/server/src/modules/mes/readiness/service.ts`） |
| T4.6.6 | 转拉前检查模板化（WP-5） | ✅ | - | ReadinessCheck 静态模板视图（无 DB 变更） |
| T4.6.7 | FAI 签字与末件（WP-6） | ✅ | - | 签字人可追溯（单签） |
| T4.6.8 | 设备点检（WP-7） | ✅ | - | AOI/SPI 设备每日点检表单落地 |
| T4.6.8.1 | 设备点检异常联动（WP-7 后续） | ✅ | T4.6.8 | 点检失败触发异常反馈链路（FAIL 自动生成生产异常） |
| T4.6.9 | 炉温程式记录（WP-8） | ✅ | - | 程式使用记录可落地 |
| T4.6.10 | 换料记录增强（WP-9） | ✅ | - | 包装数量、审核人字段落地 |
| T4.6.11 | 日常 QC 与异常（WP-10） | ✅ | - | 日常 QC 与生产异常表单落地 |
| T4.6.11.1 | 日常 QC 统计与异常闭环（WP-10 后续） | ⬜ | T4.6.11 | 班次/时间段统计可生成 |
| T4.6.12 | 其它 SMT 表单确认与拆分 | ✅ | - | 已确认：`spec/process/compair/smt_form_collection_matrix.md`；后续任务见 T4.6.12.1-2 |
| T4.6.12.1 | 维修记录表单化（QR-Pro-012） | ✅ | - | 扫 SN 录入维修原因/措施/结果；对齐 Defect/ReworkTask |
| T4.6.12.2 | 设备数采（可选）：生产数据/出入数（贴片机） | ⬜ | - | 对接设备数采或以 Track/DataValue 报表化 |

### 3.7 产线管理

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T4.7.1 | 产线管理 API：列表/新建/编辑/删除（带依赖校验与提示） | ✅ | - | |
| T4.7.2 | Web 产线管理页面：列表 + 新建/编辑/删除入口与权限控制 | ✅ | T4.7.1 | |

状态图例：⬜ 待开发 / 🔄 进行中 / ✅ 已完成

---

## 4. 参考文档

- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/spec/routing/01_routing_engine.md`
- `domain_docs/mes/spec/routing/03_route_execution_config.md`
- `domain_docs/mes/spec/traceability/01_traceability_contract.md`
- `conversation/2026-01-14_115848_mes-next_triage.md`
- `conversation/2026-01-20_094100_MES产品化架构决策.md` ← 产品化架构决策
- `domain_docs/mes/spec/architecture/01_product_abstraction.md` ← 产品化通用技术方案
- `user_docs/demo/acceptance_plan.md`
- `user_docs/demo/acceptance_issues.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`
