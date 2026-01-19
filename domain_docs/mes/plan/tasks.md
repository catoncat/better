# Phase 3 Plan (M3 - Go-Live Readiness) — Consolidated

> 状态：**已完成**
> 更新时间：2026-01-13
> 目标：把"流程已对齐"推进到"可上线/可验收/可运维"
> 说明：**本文件是 M3 的唯一进度追踪入口**（勾选更新请在此文件完成）。

---

## 0. Scope / Non-Goals

### 0.1 M3 In-Scope（上线准备）

- **端到端可验收**：把 SMT/DIP 核心闭环从“对齐映射”变成“可重复验收”的脚本/清单。
- **真实环境可部署**：单机/单体部署（single binary + SQLite）跑通；包含 TLS、备份、升级步骤。
- **执行模式收敛**：上线默认人工 TrackIn/TrackOut；自动化/批量事件摄取进入 M4。
- **集成可降级**：TPM/WMS/SPI/AOI/钢网/锡膏等外部信号均允许走“手动降级/豁免/SOP”继续生产（上线不强依赖外部系统在线）。
- **文档/培训可交付**：面向计划/工艺/质量/产线的操作手册、异常处理 SOP、演示路径。
- **数据采集可配置（必须）**：补齐 `DataCollectionSpec` 的管理能力与路由绑定体验（工程师可配置采集点）。

### 0.2 非目标（M4+ 或按需）

- 自动/批量 Ingest（自动 track-in/out、batch/test event 摄取）
- 载具/托盘追溯（carrier-level trace）
- ERP/外部系统回传（outbound feedback）
- 大规模统计报表/看板（非验收阻断项）

---

## 1. Go/No-Go 验收标准（建议）

P0（必须）：
- 新环境按 `agent_docs/00_onboarding/setup.md` 完成初始化后，可通过 UI 跑通 SMT/DIP 主流程（含门禁/质量闭环/收尾）。
- `bun apps/server/scripts/test-mes-flow.ts` 在干净 DB 上稳定通过，并输出可读的验收摘要（失败时能定位到具体步骤与错误码）。
- 生产部署路径明确：`bun run build:single` 产物可运行；TLS/端口/DB 路径/备份恢复/升级流程有文档。
- 工艺工程师可在 UI 管理 `DataCollectionSpec` 并绑定到路由/工序；执行侧能按绑定采集并在 Trace 中可见。

P1（应该）：
- 角色权限与数据范围在“典型岗位”下可用（计划/工艺/质量/组长/操作员），且 UI 入口与权限一致。
- 至少完成一次外部系统联调冒烟（选定一个 staging/sandbox 环境），并记录联调输入/输出与回归步骤（即使上线允许降级，也要有回归路径）。

---

## 2. Workstreams（可并行 Tracks）

- Track A：Docs & Contract Alignment（对齐现实、减少误判）
- Track B：E2E Demo & Seed Hardening（可重复验收）
- Track C：Ops & Deployment Readiness（可部署可运维）
- Track D：UX & Training（可用性与交付）
- Track E：Data Collection 配置（工程师配置效率）

### 2.1 建议执行顺序（Checkpoints）

- CP0（范围冻结）：完成 3.1.1 + 3.1.2，确保“验收口径”和“实现现实”一致
- CP1（可验收）：完成 3.2.1~3.2.4 + 3.5.1~3.5.5，脚本稳定通过并能定位失败原因（含采集配置/录入/追溯）
- CP2（可部署可回滚）：完成 3.3.1~3.3.2，部署/备份/升级 SOP 可复现
- CP3（可交付）：完成 3.4.1~3.4.2（必要时再收敛 3.4.3 的 P1 阻断项）

---

## 3. Task Breakdown & Status

> Status: [x] done, [~] in progress, [ ] pending

### 3.1 Track A — Docs & Contract Alignment（P0）

- [x] 3.1.1 重定义 M3/M4：把 M3 固化为"上线准备"，M4 作为"自动化/批量/回传二期"
  - DoD：`domain_docs/mes/plan/01_milestones.md`、`domain_docs/mes/CONTEXT.md`、`README.md` 的里程碑描述一致
  - Touch points：`domain_docs/mes/plan/01_milestones.md`、`domain_docs/mes/CONTEXT.md`、`README.md`

- [x] 3.1.2 修正文档 drift：验收用例与当前 API/实现一致（尤其 Data Collection/Trace 部分）
  - DoD：`domain_docs/mes/tests/01_acceptance_scenarios.md` 不再引用不存在的 API；每个场景能指向"实际脚本/页面/API"
  - Touch points：`domain_docs/mes/tests/01_acceptance_scenarios.md`、`apps/server/src/modules/mes/trace/*`、`apps/web/src/routes/_authenticated/mes/*`
  - As-built（实现入口）：
    - 验收用例：`domain_docs/mes/tests/01_acceptance_scenarios.md`
    - Trace API：`apps/server/src/modules/mes/trace/routes.ts`、`apps/server/src/modules/mes/trace/service.ts`
    - Data Collection 写入/校验：`apps/server/src/modules/mes/execution/service.ts`（TrackOut `data[]` + specName 校验与写入 DataValue）

- [x] 3.1.3 清理过期差距报告与重复规范（避免团队误判进度）
  - DoD：对 `issues/*alignment_report*` 与相关文档标注"已过期/已修复"或更新为 as-built 快照
  - Touch points：`issues/`、`domain_docs/mes/plan/*`
  - As-built（清理日期 2026-01-12）：
    - `issues/archived/smp_flows_userfeedback_draft_alignment_report.md`：标注"已过期"，M2 已实现锡膏/钢网/上料防错/OQC/SPI-AOI
    - `issues/archived/smp_flows_userfeedback_draft_review_report.md`：标注"已过期"，M2 已实现状态机/TrackIn-Out/不良处置/OQC
    - `issues/archived/data-list-*.md`：标注"已完成/已采纳"
    - `domain_docs/mes/plan/worktree_oqc_mrb_todo.md`：移动至 `archive/`

### 3.2 Track B — E2E Demo & Seed Hardening（P0）

- [x] 3.2.1 Seed 覆盖 SMT + DIP 最小主数据与可执行路由版本（READY）
  - DoD：`bun run db:seed` 后可直接创建 Run、执行门禁、跑通 execution，无需手工补表
  - Touch points：`apps/server/scripts/seed.ts`、`apps/server/scripts/seed-mes.ts`
  - Subtasks:
    - [x] 3.2.1.1 Seed: 产线默认 Readiness 开关（最小集：ROUTE + LOADING）
      - As-built（实现入口）：`apps/server/scripts/seed.ts`（Line.meta.readinessChecks.enabled）
    - [x] 3.2.1.2 Seed: 上料配置（`FeederSlot` + `SlotMaterialMapping`）覆盖 demo 产品
      - As-built（实现入口）：`apps/server/scripts/seed.ts`（FeederSlot + SlotMaterialMapping）
    - [x] 3.2.1.3 Seed: DIP 最小主数据（line/stations/routing）与可执行路由 READY
      - As-built（实现入口）：`apps/server/scripts/seed.ts`（LINE-DIP-A + PCBA-DIP-V1 + ensureDefaultRouteVersions）
    - [x] 3.2.1.4 Seed: `db:seed` 产出可重复的验收默认数据（不依赖脚本内 upsert）
      - As-built（实现入口）：`apps/server/scripts/seed.ts`（resetAllTables + seedDemoBusinessData + 安全 reset 校验）
  - As-built（实现入口）：
    - 入口命令：`apps/server/package.json`（`db:seed`）
    - Seed 主入口：`apps/server/scripts/seed.ts`

- [x] 3.2.2 E2E 演示脚本覆盖"门禁 + 质量闭环 + 收尾 + 追溯"
  - DoD：`apps/server/scripts/test-mes-flow.ts` 能走：WO→Run→Readiness→Loading→FAI→Authorize→TrackIn/Out→Defect/MRB/OQC→Closeout→Trace 校验
  - Touch points：`apps/server/scripts/test-mes-flow.ts`、`apps/server/src/modules/mes/*`
  - Subtasks:
    - [x] 3.2.2.1 Happy path（SMT）：Readiness + Loading + FAI + Authorize + Execution + Closeout
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（happy）
    - [x] 3.2.2.2 OQC：Closeout 触发后可完成（PASS）并让 Run 进入终态
      - As-built（实现入口）：`apps/server/src/modules/mes/oqc/service.ts`（OQC PASS→Run COMPLETED）、`apps/server/src/modules/mes/run/service.ts`（closeout gate）
    - [x] 3.2.2.3 Trace：校验 route + routeVersion + steps +（至少）上料/检验摘要可定位
      - [x] Trace 响应包含 inspections 摘要（至少 type/status/id，可用于定位 FAI/OQC）
        - As-built（实现入口）：`apps/server/src/modules/mes/trace/schema.ts`（`inspections[]`）、`apps/server/src/modules/mes/trace/service.ts`
      - [x] Trace 响应包含上料摘要（从 LoadingRecord 派生，至少 slotCode/materialCode/lotNo/loadedAt）
        - As-built（实现入口）：`apps/server/src/modules/mes/trace/schema.ts`（`loadingRecords[]`）、`apps/server/src/modules/mes/trace/service.ts`
      - [x] `apps/server/scripts/test-mes-flow.ts` 对 inspections/上料摘要做断言
        - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（Trace 断言：inspections + loadingRecords）
    - [x] 3.2.2.4 Negative branch：至少覆盖一个失败分支（Loading mismatch / OQC FAIL / MRB）
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（Loading mismatch + oqc-fail-*）
  - As-built（实现入口）：
    - 验收脚本：`apps/server/scripts/test-mes-flow.ts`
    - Trace：`apps/server/src/modules/mes/trace/routes.ts`、`apps/server/src/modules/mes/trace/service.ts`

- [x] 3.2.3 把演示脚本升级为“验收脚本”：可选择场景、可重复、可定位
  - DoD：脚本支持参数（例如只跑 SMT/只跑 DIP/只跑 OQC fail 分支），并输出结构化摘要（建议 JSON + 人类可读）
  - Touch points：`apps/server/scripts/test-mes-flow.ts`
  - Subtasks:
    - [x] 3.2.3.1 CLI：场景选择（SMT/DIP + 分支）与输出选项
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（CLI 解析：track/scenario/json/json-file）
    - [x] 3.2.3.2 Summary：结构化结果（JSON）+ 人类可读步骤摘要（含错误码/步骤名）
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（FlowSummary/StepResult + 输出）
    - [x] 3.2.3.3 Repeatable：同一场景可重复跑（数据隔离/幂等策略明确）
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（`--id-strategy`/`--dataset` + WO/SN 生成策略）
  - As-built（实现入口）：
    - 验收脚本：`apps/server/scripts/test-mes-flow.ts`

- [x] 3.2.4 外部集成“降级路径”纳入验收（不依赖外部系统在线）
  - DoD：脚本/清单明确如何用 MANUAL/waive 方式通过钢网/锡膏/设备等门禁；并能在 Trace 中看到来源标识
  - Touch points：`apps/server/scripts/test-mes-flow.ts`、`apps/server/src/modules/mes/integration/*`、`apps/server/src/modules/mes/readiness/*`
  - Subtasks:
    - [x] 3.2.4.1 Readiness: 演示 waive/降级路径（不依赖外部系统在线）
      - As-built（实现入口）：`apps/server/scripts/test-mes-flow.ts`（readiness-waive：enable gates + waive）
    - [x] 3.2.4.2 Trace: 降级/豁免来源在 Trace 中可追溯（source/actor/reason）
      - As-built（实现入口）：`apps/server/src/modules/mes/trace/schema.ts`、`apps/server/src/modules/mes/trace/service.ts`（readiness.waivedItems）
  - As-built（实现入口）：
    - 验收脚本：`apps/server/scripts/test-mes-flow.ts`（readiness-waive）
    - Readiness：`apps/server/src/modules/mes/readiness/routes.ts`、`apps/server/src/modules/mes/readiness/service.ts`

- [x] 3.2.5 Guard: 创建批次校验产线与路由执行语义兼容
  - DoD：创建 Run 时校验所选产线包含路由步骤所需的站点组/工位约束（`stationGroupId`/`allowedStationIds`/`stationType`）；不兼容则阻止创建并给出可定位提示
  - Touch points：`apps/server/src/modules/mes/work-order/service.ts`、`apps/server/src/modules/mes/readiness/service.ts`、`apps/server/src/modules/mes/execution/service.ts`、`apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx`
  - Subtasks:
    - [x] 3.2.5.1 Server: `createRun` 校验 route snapshot 与 line stations 兼容
    - [x] 3.2.5.2 Readiness: `ROUTE` 检查补充“产线-站点组兼容性”
    - [x] 3.2.5.3 Execution: TrackIn/Out 校验 station 属于 run.line
    - [x] 3.2.5.4 Web: Run 创建对话框预填/锁定派工产线 + 友好错误提示

- [x] 3.2.6 FAI 试产执行：支持 Run=PREP 下 TrackIn/TrackOut（受控）
  - 背景：`spec/process/03_smt_flows.md` 要求 “创建 FAI → 首件生产(试产) → 判定 → Run 授权”，但当前 execution 仅允许 `Run=AUTHORIZED|IN_PROGRESS`。
  - DoD：
    - Run=PREP 且存在 active FAI（INSPECTING）时，允许在工位执行页完成试产 TrackIn/TrackOut，不把 Run 推进到 IN_PROGRESS
    - 试产必须先通过 readiness（formal 或豁免后全通过），否则禁止试产
    - 试产数量受 FAI.sampleQty 约束（按 unit 去重）
    - Run 授权逻辑保持不变：仍需 readiness + FAI PASS
  - Touch points：
    - `apps/server/src/modules/mes/execution/service.ts`
    - `apps/server/src/modules/mes/fai/service.ts`
    - `apps/web/src/routes/_authenticated/mes/execution.tsx`（如需 UX 提示）

### 3.3 Track C — Ops & Deployment Readiness（P0）

- [x] 3.3.1 单体部署清单化：构建、运行、TLS、端口、Web 模式、DB 路径
  - DoD：部署文档按“从零到可访问”可复现；包含最小环境变量与常见故障排查
  - Touch points：`agent_docs/05_ops/single_binary_deployment.md`、`README.md`

- [x] 3.3.2 SQLite 备份/恢复/升级 SOP（上线必备）
  - DoD：明确“升级前备份”“回滚恢复”“db:deploy 流程”“数据目录权限/磁盘策略”
  - Touch points：`agent_docs/05_ops/single_binary_deployment.md`（或新增 ops 文档）、`agent_docs/00_onboarding/setup.md`

- [x] 3.3.3 日志与审计最低配置（上线可运维）
  - DoD：明确日志开关与审计事件查询路径（UI/API）
  - Touch points：`apps/server/src/modules/audit/*`、`apps/web/src/routes/_authenticated/system/*`

### 3.4 Track D — UX & Training（P1）

- [x] 3.4.1 角色化操作手册（计划/工艺/质量/组长/操作员）
  - DoD：每个角色给出“入口→关键操作→常见异常→自助排查”；与现有权限/页面一致
  - Touch points：`user_docs/`、`apps/web/src/routes/_authenticated/mes/*`
  - As-built（实现入口）：
    - 概览：`user_docs/00_role_overview.md`
    - 角色指南：`user_docs/02_planner.md`、`user_docs/03_engineer.md`、`user_docs/04_quality.md`、`user_docs/05_leader.md`、`user_docs/06_operator.md`

- [x] 3.4.2 上线演示脚本（现场演示顺序 + 讲解点）
  - DoD：形成 10~20 分钟可讲完的演示路线（包含失败分支示例与追溯展示）
  - Touch points：`user_docs/`、`domain_docs/mes/tests/01_acceptance_scenarios.md`
  - Subtasks:
    - [x] 3.4.2.1 Demo Guide: SMT 全流程（按 `spec/process/01_end_to_end_flows.md` + `03_smt_flows.md` 走完）
    - [x] 3.4.2.2 Demo Guide: DIP 全流程（按 `spec/process/01_end_to_end_flows.md` + `04_dip_flows.md` 走完）
    - [x] 3.4.2.3 Demo Guide: 失败分支示例（readiness fail/waive, NG/处置, OQC fail/MRB）

- [x] 3.4.3 体验优化清单（仅收敛到 P1 阻断项）
  - DoD：收集并分级：P0 阻断 / P1 重要 / P2 可延后；每项绑定到具体页面与期望行为
  - Touch points：`apps/web/src/routes/_authenticated/mes/*`
  - Subtasks:
    - [x] 3.4.3.1 Demo guide "dry run" 校验：按 `user_docs/demo/guide.md` 从头跑一次并修正文案/入口偏差
      - As-built: 2026-01-13 验证通过，guide 与实际 UI 一致
    - [x] 3.4.3.2 Run detail → Execution：新增"开始执行"深链（预填 runNo/woNo，减少跳转成本）
      - As-built: `$runNo.tsx:331-345` PREP 状态显示"试产执行"，AUTHORIZED/IN_PROGRESS 显示"开始执行"
    - [x] 3.4.3.3 Execution：增加"待执行批次"列表（AUTHORIZED + PREP 可试产），点击即可带入表单
      - As-built: `execution.tsx:324-376` 已实现，无需额外修改
    - [x] 3.4.3.4 Demo guide：明确 Unit 生成路径（TrackIn 自动建 Unit vs 手动"生成单件"按钮）
      - As-built: `guide.md:116-127` 新增 Unit 生成路径对比表格和说明
  - References：`conversation/2026-01-12_143644_demo-guide-accuracy-and-next-plan.md`

- [x] 3.4.4 外部集成降级 SOP（TPM/WMS/SPI/AOI/钢网/锡膏）
  - DoD：给出"不可用时怎么做/恢复后怎么切回/谁有权限操作/需要哪些审计记录"的明确步骤
  - Touch points：`user_docs/`、`apps/web/src/routes/_authenticated/mes/*`、`apps/server/src/modules/mes/integration/*`
  - As-built：`user_docs/sop_degraded_mode.md` - 统一 SOP 文档，涵盖：
    - TPM/WMS 降级（Readiness 手动录入）
    - SPI/AOI 降级（检测结果手动录入）
    - Readiness 豁免（最后手段）
    - 降级决策流程图
    - 权限与审计要求

### 3.5 Track E — Data Collection 配置（P0）

> 结论：**必须补齐**（工程师可配置采集点；不再依赖手工 seed/手输 ID）。

- [x] 3.5.1 API: `DataCollectionSpec` CRUD（按 Operation 维度）
  - DoD：支持 list/filter（operation/name/isActive）、create/update/enable-disable；权限与审计明确
  - Touch points：`packages/db/prisma/schema/schema.prisma`、`apps/server/src/modules/mes/*`（新增模块）
  - Subtasks:
    - [x] 3.5.1.1 Schema: `DataCollectionSpec` 模型与必要索引/关系
      - As-built（实现入口）：`packages/db/prisma/schema/schema.prisma`（model DataCollectionSpec + index/unique）
    - [x] 3.5.1.2 Server: CRUD routes + schemas + service（含 filter/sort/pagination）
      - As-built（实现入口）：`apps/server/src/modules/mes/data-collection-spec/routes.ts`、`apps/server/src/modules/mes/data-collection-spec/schema.ts`、`apps/server/src/modules/mes/data-collection-spec/service.ts`
    - [x] 3.5.1.3 RBAC/Audit: 权限常量 + 默认角色 + 审计事件
      - As-built（实现入口）：`packages/db/src/permissions/permissions.ts`、`packages/db/src/permissions/preset-roles.ts`、`apps/server/src/modules/mes/data-collection-spec/routes.ts`（recordAuditEvent）
    - [x] 3.5.1.4 Types: Eden types 回填与 API 客户端可用
      - As-built（实现入口）：`apps/server/src/index.ts`（export type App）、`apps/web/src/lib/eden.ts`（treaty uses ServerApp routes）
  - As-built（实现入口）：
    - 模块挂载：`apps/server/src/modules/mes/routes.ts`（use dataCollectionSpecModule）

- [x] 3.5.2 Web: 采集项管理页（列表 + 新增/编辑对话框）
  - DoD：工程师可自助配置采集项（name/type/method/spec/alarm/isRequired/isActive）；可快速检索
  - Touch points：`apps/web/src/routes/_authenticated/mes/*`（新增路由/页面）
  - Subtasks:
    - [x] 3.5.2.1 Web List: 列表/筛选/状态切换（enable-disable）
      - As-built（实现入口）：`apps/web/src/routes/_authenticated/mes/data-collection-specs/index.tsx`
    - [x] 3.5.2.2 Web Dialog: 新增/编辑（TanStack Form + Zod）
      - As-built（实现入口）：`apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/spec-dialog.tsx`
    - [x] 3.5.2.3 UX: 表单校验与错误提示（与后端一致）
      - As-built（实现入口）：`apps/web/src/hooks/use-data-collection-specs.ts`（toast 错误处理）、`apps/web/src/components/ui/form-field-wrapper.tsx`（Field 校验显示）
  - As-built（实现入口）：
    - 列表页：`apps/web/src/routes/_authenticated/mes/data-collection-specs/index.tsx`
    - 对话框：`apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/spec-dialog.tsx`
    - 列定义：`apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/columns.tsx`
    - 卡片视图：`apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/card.tsx`
    - 字段元数据：`apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/field-meta.tsx`
    - Hooks：`apps/web/src/hooks/use-data-collection-specs.ts`、`apps/web/src/hooks/use-operations.ts`

- [x] 3.5.3 Web: 路由配置绑定体验升级（替换 `dataSpecIdsText` 手填）
  - DoD：路由配置页支持选择/移除采集项，并可按 Operation/Step 做绑定；保存后可编译进入 route snapshot
  - Touch points：`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`、`apps/server/src/modules/mes/routing/service.ts`
  - Subtasks:
    - [x] 3.5.3.1 Web: 采集项选择器（按 Operation 分组/搜索）
      - As-built（实现入口）：`apps/web/src/routes/_authenticated/mes/-components/data-spec-selector.tsx`、`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
    - [x] 3.5.3.2 Server: compile 将绑定写入 snapshot（`dataSpecIds`）
      - As-built（实现入口）：`apps/server/src/modules/mes/routing/service.ts`（compileRouteExecution）
    - [x] 3.5.3.3 Guard: 绑定缺失/工序不匹配时给出可定位错误
      - As-built（实现入口）：`apps/server/src/modules/mes/routing/service.ts`（DATA_SPEC_NOT_FOUND / DATA_SPEC_OPERATION_MISMATCH）

- [x] 3.5.4 Execution: 手工数据采集入口补齐（TrackOut 时录入）
  - DoD：执行页在 TrackOut 时按绑定的 specs 生成输入项并校验类型；**PASS** 缺必填项时阻断并提示（与后端一致）
  - Touch points：`apps/web/src/routes/_authenticated/mes/execution.tsx`、`apps/server/src/modules/mes/execution/schema.ts`
  - Subtasks:
    - [x] 3.5.4.1 Web: TrackOut 对话框生成动态输入项（按 spec dataType）
      - As-built（实现入口）：`apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx`
    - [x] 3.5.4.2 Server: `REQUIRED_DATA_MISSING` / `DATA_VALUE_INVALID` 错误可读且可定位
      - As-built（实现入口）：`apps/server/src/modules/mes/execution/service.ts`（trackOut data[] 校验）
  - As-built（实现入口）：
    - API: `apps/server/src/modules/mes/execution/routes.ts`（GET /:stationCode/unit/:sn/data-specs）
    - Service: `apps/server/src/modules/mes/execution/service.ts`（getUnitDataSpecs）
    - Schema: `apps/server/src/modules/mes/execution/schema.ts`（unitDataSpecsResponseSchema）
    - Hook: `apps/web/src/hooks/use-station-execution.ts`（useUnitDataSpecs）
    - Dialog: `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx`
    - Page: `apps/web/src/routes/_authenticated/mes/execution.tsx`（集成 TrackOutDialog）

- [x] 3.5.5 RBAC: 默认角色权限对齐（采集配置/采集录入）
  - DoD：engineer 可管理采集项；执行角色具备必要的数据采集能力；权限与 UI 入口一致
  - Touch points：`packages/db/src/permissions/permissions.ts`、`packages/db/src/permissions/preset-roles.ts`
  - Subtasks:
    - [x] 3.5.5.1 Permissions: 新增/复用权限点并加入默认角色
      - As-built（实现入口）：`packages/db/src/permissions/permissions.ts`、`packages/db/src/permissions/preset-roles.ts`
    - [x] 3.5.5.2 Web: 页面/按钮入口与权限一致（无权限不渲染或禁用）
      - As-built（实现入口）：`apps/web/src/config/navigation.ts`、`apps/web/src/routes/_authenticated/mes/data-collection-specs/index.tsx`

---

## 4. Progress / Workflow Policy（契合本仓库工作流）

- 本文件是 M3 唯一进度入口：完成一项就勾选（`[x]`），执行中用 `[~]`。
- 每个 Track 的一个“最小闭环”作为一次小步提交（docs / seed+script / ops / ux），不要堆成一个大 PR。
- 任何范围调整/新增任务：先更新本文件，再改实现；并同步到 `conversation/` 记录决策。
- 完成 M3 前的基本检查：在将要合并的 worktree 上跑 `bun run lint`、`bun run check-types`。

---

## 5. 验收过程中发现的改进项

> 以下是端到端手动验收中发现的 UX/功能改进项，标记优先级后纳入后续迭代。
> 状态：[ ] 待修复, [~] 进行中, [x] 已完成

### 5.1 阶段3：上料防错

| # | 问题描述 | 期望行为 | 涉及文件 | 优先级 | 状态 |
|---|----------|----------|----------|--------|------|
| 5.1.1 | 批次详情页就绪检查通过后，无"前往上料"入口 | 就绪检查 PASSED 后显示"前往上料"按钮，点击跳转 `/mes/loading?runNo=XXX` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | P1 | [x] |
| 5.1.2 | 上料页面"解锁站位"按钮无条件显示 | 只有当站位 `isLocked=true` 时才显示解锁按钮；需要后端 API 返回 `isLocked` 字段 | `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx`, `apps/server/src/modules/mes/loading/service.ts` | P2 | [x] |
| 5.1.3 | 上料页面批次号输入框应改为带搜索的下拉选择 | 批次号选择应是可搜索的 Select 组件，列出可用批次（状态=PREP），而非手动输入 | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` | P1 | [x] |
| 5.1.4 | 物料条码格式说明不清晰 | 在物料条码输入框添加 placeholder 或提示，说明支持的格式：`物料编码\|批次号` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` | P2 | [x] |
| 5.1.5 | 重复扫描同一物料无法区分首次成功和幂等返回 | UI 应区分显示"上料成功"vs"已上料（重复扫描）"；API 可返回 `isIdempotent` 标记 | `apps/server/src/modules/mes/loading/service.ts`, `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` | P2 | [x] |
| 5.1.6 | 幂等返回时仍创建审计日志 | 幂等返回不应重复创建审计记录，或标记为 `idempotent: true` | `apps/server/src/modules/mes/loading/routes.ts` | P2 | [x] |
| 5.1.7 | 上料验证失败时前端只显示"失败"，无具体原因 | 前端应显示后端返回的错误信息，如"站位已上料，请使用换料模式" | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx`, `apps/web/src/hooks/use-loading.ts` | P1 | [x] |
| 5.1.8 | **BUG**: LOADING 就绪检查在未加载站位表时错误通过 | 当产线有 FeederSlot 但 RunSlotExpectation 为空时，应失败并提示"请先加载站位表"，而非跳过 | `apps/server/src/modules/mes/readiness/service.ts:464` | **P0** | [x] |
| 5.1.9 | 批次详情页缺少流程进度指引 | 应显示当前批次处于流程的哪个阶段（就绪检查→上料→FAI→授权→执行→收尾），并高亮下一步操作；用户目前不知道上料是否完成、何时可以开始 FAI | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | **P1** | [x] |

### 5.2 阶段4：首件检验 (FAI)

| # | 问题描述 | 期望行为 | 涉及文件 | 优先级 | 状态 |
|---|----------|----------|----------|--------|------|
| 5.2.1 | FAI 列表页 Run 编号筛选是手动输入 | 应改为带搜索的下拉选择，列出有 FAI 任务的批次 | `apps/web/src/routes/_authenticated/mes/fai.tsx` | P1 | [x] |
| 5.2.2 | **BUG**: FAI 可跳过试产直接完成判定 | 根据流程规范，FAI 必须先进行"首件生产（试产）"即 TrackIn/TrackOut，才能记录检验项和完成判定；当前可直接跳过 | `apps/server/src/modules/mes/fai/service.ts`, `apps/web/src/routes/_authenticated/mes/fai.tsx` | **P0** | [x] |
| 5.2.3 | FAI 开始时无提示生成 Unit | FAI 开始（start）时应检查 Run 是否已有 Unit，若无则提示或自动生成 sampleQty 个 Unit | `apps/server/src/modules/mes/fai/service.ts` (startFai), `apps/web/src/routes/_authenticated/mes/fai.tsx` | P1 | [x] |
| 5.2.4 | FAI sampleQty 与 Unit 生成脱节 | 创建 FAI 时应检查 Run 是否已有足够 Unit（≥sampleQty）；设计决策：FAI 复用生产 Unit 池（首批试产 Unit 即正式生产 Unit），非独立池 | `apps/server/src/modules/mes/fai/service.ts` (createFai) | P1 | [x] |
| 5.2.5 | 执行页面缺少待进站 Unit 列表 | 应在批次卡片展开后显示 QUEUED 状态的 Unit，支持一键进站；FAI 模式下显示试产进度 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | P1 | [x] |
| 5.2.6 | 执行页面工单号/批次号是手动输入 | 应改为带搜索的下拉选择器 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | P2 | [x] |
| 5.2.7 | 执行页面无 FAI 模式提示 | 批次状态为 PREP 时应显示"FAI 试产"标签和进度（如"已试产 0/2"） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | P2 | [x] |
| 5.2.8 | 当前队列表格需横向滚动才能看到操作按钮 | SN 列太长导致操作按钮被挤出视口；应截断 SN 或使用响应式布局 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | P2 | [x] |
| 5.2.9 | **BUG**: 报不良缺少不良信息记录 | 当前只传 `result: FAIL`，无缺陷代码/位置/备注；应弹出完整的不良记录对话框 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | **P1** | [x] |
| 5.2.10 | API 错误未在页面显示 | 如 `FAI_TRIAL_STEP_NOT_ALLOWED` 等错误只返回 JSON，页面无 toast 提示 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | P1 | [x] |
| 5.2.11 | 不知道 Unit 下一步工序/工位 | 用户需要手动查路由推断工位，应在 Unit 详情或执行页面显示"下一步：Step 2 SPI → 工位 ST-SPI-01" | `apps/web/src/routes/_authenticated/mes/execution.tsx`, 批次详情 | P1 | [x] |
| 5.2.12 | 批次详情缺少路由步骤信息 | 应显示完整路由（Step 1 PRINTING → Step 2 SPI → ...）及各 Unit 的当前进度 | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | P1 | [x] |
| 5.2.13 | FAI 试产规则无前端提示 | 用户不知道"FAI 只在第一工序"，应在 FAI 页面或执行页面明确说明 | FAI 页面 + 执行页面 | P2 | [x] |
| 5.2.14 | FAI「记录」字段固定，无动态配置 | FAI 检验项应可关联 `DataCollectionSpec` 或 FAI 专用检验清单模板（如首件检验 checklist），而非每次手动填写 | `apps/web/src/routes/_authenticated/mes/fai.tsx`, `apps/server/src/modules/mes/fai/service.ts` | P2 | [x] |
| 5.2.15 | FAI 未关联 TrackOut 检验结果 | FAI 完成判定时应能查看该批次试产 Unit 的 TrackOut 数据采集结果和 SPI/AOI 检验记录，作为判定依据 | FAI 详情页, `apps/server/src/modules/mes/fai/service.ts` | P2 | [x] |
| 5.2.16 | **BUG**: FAI 完成后 TrackIn 错误提示不准确 | 当 Run=PREP + FAI=PASS 时，TrackIn 返回 `FAI_TRIAL_NOT_READY`（提示 start FAI first），但实际应返回 `RUN_NOT_AUTHORIZED`（提示请先授权批次） | `apps/server/src/modules/mes/execution/service.ts:241-247` | **P1** | [x] |
| 5.2.17 | **BUG**: FAI 完成后"试产执行"按钮仍显示 | 当 FAI=PASS 时，批次详情页仍显示"试产执行"按钮；应根据 FAI 状态决定：FAI=INSPECTING 显示"试产执行"，FAI=PASS/无 FAI 时隐藏或显示"等待授权" | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx:331-345` | **P1** | [x] |
| 5.2.18 | 试产流程入口不清晰，需手动跳转执行页 | 点击"试产执行"应引导用户完成试产流程：检查/生成 Unit → 跳转执行页（预填参数）→ 完成后返回 FAI 判定；当前只是简单跳转 | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`, 执行页 | P1 | [x] |
| 5.2.19 | 执行页面未显示当前步骤信息 | 当多个步骤可在同一工位执行时，用户无法区分当前是哪个步骤；应在 TrackIn/TrackOut 时明确显示"当前步骤：Step 2 SPI 检验"，而不仅是工位代码 | `apps/web/src/routes/_authenticated/mes/execution.tsx` | **P1** | [x] |
| 5.2.20 | Seed 数据：演示路由所有步骤指向同一工位组 | 演示数据过于简化，所有 5 个步骤的 `stationGroupId` 相同，导致无法体验真实的多工位流转；应为每个步骤配置不同的工位组 | `apps/server/scripts/seed-mes.ts` | P2 | [x] |
| 5.2.21 | FAI 创建和"开始"应合并为一个操作 | 当前创建 FAI 后需要返回列表再点"开始"，操作不直观；应在创建时自动开始，或创建成功后直接跳转到 FAI 详情页并显示"开始"按钮 | `apps/web/src/routes/_authenticated/mes/fai.tsx`, `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | P1 | [x] |
| 5.2.22 | FAI 流程应端到端连贯 | 创建 FAI → 检查/生成 Unit → 开始试产 应在一个引导流程中完成，而非在多个页面间跳转；建议使用向导式对话框或步骤提示 | FAI 创建流程 | P1 | [x] |

#### 5.2.A UI 设计参考（关联 5.2.5 ~ 5.2.13）

**1. 执行页面增强（5.2.5, 5.2.8, 5.2.11）**

```
当前队列（改进后）：
┌──────────────────────────────────────────────────────────┐
│ SN               │ 当前步骤      │ 下一步          │ 操作   │
├──────────────────┼──────────────┼────────────────┼────────┤
│ SN-...-0001     │ Step 1 印刷  │ Step 2 SPI    │ [出站] │
│                 │ (ST-PRINT-01)│ (ST-SPI-01)   │        │
└──────────────────────────────────────────────────────────┘
```

**2. 批次详情增强（5.2.12）**

```
路由进度：
┌──────────────────────────────────────────────────────────┐
│ Step 1: 印刷 (PRINTING)     ●━━━━━━━━━━━━━━○ 2/4 完成    │
│ Step 2: SPI 检验            ○─────────────○ 0/4 完成    │
│ Step 3: 贴片 (MOUNTING)     ○─────────────○ 0/4 完成    │
│ Step 4: 回流焊 (REFLOW)     ○─────────────○ 0/4 完成    │
│ Step 5: AOI 检验            ○─────────────○ 0/4 完成    │
└──────────────────────────────────────────────────────────┘

Unit 列表：
│ SN           │ 状态       │ 当前步骤  │ 操作              │
├──────────────┼───────────┼──────────┼──────────────────┤
│ ...-0001    │ QUEUED    │ Step 2   │ [去 ST-SPI-01]   │
│ ...-0002    │ IN_STATION│ Step 1   │ [在 ST-PRINT-01] │
```

**3. FAI 页面增强（5.2.7, 5.2.13）**

```
FAI 试产说明：
┌──────────────────────────────────────────────────────────┐
│ NOTE: FAI 试产规则                                          │
│ - 仅在第一工序 (PRINTING) 进行                             │
│ - 需完成 2 个 Unit 的 TrackIn/TrackOut                    │
│ - 完成后返回此页面记录检验项并判定                           │
│                                                          │
│ 试产进度：1/2 ========--------                            │
│ - Unit 1: DONE 已完成 TrackOut                            │
│ - Unit 2: PENDING 待 TrackIn                              │
└──────────────────────────────────────────────────────────┘
```

---

### 5.3 系统性改进：API 错误处理审查

> 背景：验收过程中发现多处 API 错误未在前端显示，或错误提示不准确。需要系统性审查所有 MES API 的错误处理机制。
> 状态：[~] 进行中

#### 5.3.1 审查范围

| 模块 | API 路径 | 审查状态 |
|------|----------|----------|
| 工单管理 | `/api/mes/work-orders/*` | [ ] |
| 批次管理 | `/api/mes/runs/*` | [x] |
| 就绪检查 | `/api/mes/readiness/*` | [x] |
| 上料防错 | `/api/mes/loading/*` | [x] |
| FAI 首件检验 | `/api/mes/fai/*` | [x] |
| 执行 (TrackIn/Out) | `/api/mes/execution/*` | [x] |
| OQC 出货检验 | `/api/mes/oqc/*` | [ ] |
| MRB 不良处置 | `/api/mes/mrb/*` | [ ] |
| 追溯查询 | `/api/mes/trace/*` | [ ] |

#### 5.3.2 审查清单（每个 API）

| # | 检查项 | 说明 |
|---|--------|------|
| 1 | **错误码完整性** | 所有业务错误是否有明确的错误码（如 `FAI_NOT_FOUND`、`RUN_NOT_AUTHORIZED`） |
| 2 | **错误消息准确性** | 错误消息是否准确描述问题和解决方案（如 5.2.16 的 "start FAI first" 应改为 "请先授权批次"） |
| 3 | **错误消息可国际化** | 错误消息是否支持中英文（当前大部分是英文） |
| 4 | **前端 Toast 显示** | 前端是否对 API 错误显示 toast 提示，而非静默失败 |
| 5 | **前端错误解析** | 前端是否正确解析 `error.code` 和 `error.message`，并显示用户友好信息 |
| 6 | **边界条件覆盖** | 是否覆盖所有边界条件（如 5.2.16：FAI=PASS + Run=PREP 的组合） |

#### 5.3.3 已发现问题汇总

| 来源 | 问题 | 关联编号 |
|------|------|----------|
| 5.1.7 | 上料验证失败时前端只显示"失败"，无具体原因 | P1 |
| 5.2.10 | `FAI_TRIAL_STEP_NOT_ALLOWED` 等错误只返回 JSON，页面无 toast | P1 |
| 5.2.16 | FAI 完成后 TrackIn 错误提示不准确（应提示授权而非 start FAI） | P1 |

#### 5.3.4 修复方案（建议）

**后端统一错误格式**：
```typescript
interface ApiError {
  code: string;           // 机器可读（如 "RUN_NOT_AUTHORIZED"）
  message: string;        // 用户可读（如 "批次未授权，请先完成授权"）
  details?: object;       // 可选：额外上下文（如 { runNo, currentStatus }）
}
```

**前端统一错误处理**：
```typescript
// hooks/use-api-error.ts
function useApiError() {
  return (error: ApiError) => {
    toast.error(error.message || "操作失败，请重试");
    // 可选：根据 code 做特殊处理（如跳转、刷新）
  };
}
```

**错误码注册表**：
- 建议创建 `packages/shared/src/error-codes.ts`，统一定义所有错误码及其描述
- 前后端共用，避免硬编码

---

### 5.4 阶段6：批量执行 (Execution)

| # | 问题描述 | 期望行为 | 涉及文件 | 优先级 | 状态 |
|---|----------|----------|----------|--------|------|
| 5.4.1 | **BUG**: TrackOut FAIL 后 Unit 仍可进站 | TrackIn 应检查 `OUT_FAILED`/`SCRAPPED` 状态并拒绝进站；当前只检查 `IN_STATION` 和 `DONE` | `apps/server/src/modules/mes/execution/service.ts:314-327` | **P0** | [x] |

---

### 5.5 阶段7：质量闭环 (Defect/OQC/MRB)

| # | 问题描述 | 期望行为 | 涉及文件 | 优先级 | 状态 |
|---|----------|----------|----------|--------|------|
| 5.5.1 | **BUG**: 返工步骤可任意选择 | 返工步骤应 ≤ Unit 当前失败步骤（如 Step 3 失败只能选 1/2/3）；当前可选择任意步骤包括未执行过的步骤 | 不良处置页面, `apps/server/src/modules/mes/defect/service.ts` | **P1** | [x] |
| 5.5.2 | 缺陷页面未显示失败步骤信息 | 应显示 Unit 在哪个步骤失败（如 "Step 3 SPI 检验"）、失败工位、缺陷代码，用户才能判断返工到哪个步骤 | 缺陷列表/详情页面 | **P1** | [x] |
| 5.5.3 | 返工任务与工位执行未联动 | Unit 完成返工步骤后，Rework Task 仍显示"进行中"；应自动关闭或明确提示用户需要手动确认完成 | 返工处置页面, `apps/server/src/modules/mes/rework` | **P1** | [x] |
| 5.5.4 | 返工完成流程不清晰 | 用户不知道返工后是否需要手动点击"完成"并填写内容；应有明确的流程指引和状态提示 | 返工处置页面 | P1 | [x] |

---

## 6. References

- 计划：`domain_docs/mes/plan/01_milestones.md`
- M2 现状：`domain_docs/mes/plan/tasks.md.md`
- 验收用例：`domain_docs/mes/tests/01_acceptance_scenarios.md`
- 演示脚本：`apps/server/scripts/test-mes-flow.ts`
- 部署：`agent_docs/05_ops/single_binary_deployment.md`
