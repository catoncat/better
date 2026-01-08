# Phase 3 Plan (M3 - Go-Live Readiness) — Consolidated

> 状态：**规划中**
> 更新时间：2026-01-07
> 目标：把“流程已对齐”推进到“可上线/可验收/可运维”
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

- [ ] 3.1.1 重定义 M3/M4：把 M3 固化为“上线准备”，M4 作为“自动化/批量/回传二期”
  - DoD：`domain_docs/mes/plan/01_milestones.md`、`domain_docs/mes/CONTEXT.md`、`README.md` 的里程碑描述一致
  - Touch points：`domain_docs/mes/plan/01_milestones.md`、`domain_docs/mes/CONTEXT.md`、`README.md`

- [ ] 3.1.2 修正文档 drift：验收用例与当前 API/实现一致（尤其 Data Collection/Trace 部分）
  - DoD：`domain_docs/mes/tests/01_acceptance_scenarios.md` 不再引用不存在的 API；每个场景能指向“实际脚本/页面/API”
  - Touch points：`domain_docs/mes/tests/01_acceptance_scenarios.md`、`apps/server/src/modules/mes/trace/*`、`apps/web/src/routes/_authenticated/mes/*`

- [ ] 3.1.3 清理过期差距报告与重复规范（避免团队误判进度）
  - DoD：对 `issues/*alignment_report*` 与相关文档标注“已过期/已修复”或更新为 as-built 快照
  - Touch points：`issues/`、`domain_docs/mes/plan/*`

### 3.2 Track B — E2E Demo & Seed Hardening（P0）

- [~] 3.2.1 Seed 覆盖 SMT + DIP 最小主数据与可执行路由版本（READY）
  - DoD：`bun run db:seed` 后可直接创建 Run、执行门禁、跑通 execution，无需手工补表
  - Touch points：`apps/server/scripts/seed.ts`、`apps/server/scripts/seed-mes.ts`
  - Subtasks:
    - [x] 3.2.1.1 Seed: 产线默认 Readiness 开关（最小集：ROUTE + LOADING）
    - [x] 3.2.1.2 Seed: 上料配置（`FeederSlot` + `SlotMaterialMapping`）覆盖 demo 产品
    - [x] 3.2.1.3 Seed: DIP 最小主数据（line/stations/routing）与可执行路由 READY
    - [ ] 3.2.1.4 Seed: `db:seed` 产出可重复的验收默认数据（不依赖脚本内 upsert）

- [~] 3.2.2 E2E 演示脚本覆盖“门禁 + 质量闭环 + 收尾 + 追溯”
  - DoD：`apps/server/scripts/test-mes-flow.ts` 能走：WO→Run→Readiness→Loading→FAI→Authorize→TrackIn/Out→Defect/MRB/OQC→Closeout→Trace 校验
  - Touch points：`apps/server/scripts/test-mes-flow.ts`、`apps/server/src/modules/mes/*`
  - Subtasks:
    - [x] 3.2.2.1 Happy path（SMT）：Readiness + Loading + FAI + Authorize + Execution + Closeout
    - [x] 3.2.2.2 OQC：Closeout 触发后可完成（PASS）并让 Run 进入终态
    - [x] 3.2.2.3 Trace：校验 route + routeVersion + steps +（至少）上料/检验摘要可定位
    - [ ] 3.2.2.4 Negative branch：至少覆盖一个失败分支（Loading mismatch / OQC FAIL / MRB）

- [~] 3.2.3 把演示脚本升级为“验收脚本”：可选择场景、可重复、可定位
  - DoD：脚本支持参数（例如只跑 SMT/只跑 DIP/只跑 OQC fail 分支），并输出结构化摘要（建议 JSON + 人类可读）
  - Touch points：`apps/server/scripts/test-mes-flow.ts`
  - Subtasks:
    - [x] 3.2.3.1 CLI：场景选择（SMT/DIP + 分支）与输出选项
    - [x] 3.2.3.2 Summary：结构化结果（JSON）+ 人类可读步骤摘要（含错误码/步骤名）
    - [ ] 3.2.3.3 Repeatable：同一场景可重复跑（数据隔离/幂等策略明确）

- [ ] 3.2.4 外部集成“降级路径”纳入验收（不依赖外部系统在线）
  - DoD：脚本/清单明确如何用 MANUAL/waive 方式通过钢网/锡膏/设备等门禁；并能在 Trace 中看到来源标识
  - Touch points：`apps/server/scripts/test-mes-flow.ts`、`apps/server/src/modules/mes/integration/*`、`apps/server/src/modules/mes/readiness/*`
  - Subtasks:
    - [ ] 3.2.4.1 Readiness: 演示 waive/降级路径（不依赖外部系统在线）
    - [ ] 3.2.4.2 Trace: 降级/豁免来源在 Trace 中可追溯（source/actor/reason）

### 3.3 Track C — Ops & Deployment Readiness（P0）

- [ ] 3.3.1 单体部署清单化：构建、运行、TLS、端口、Web 模式、DB 路径
  - DoD：部署文档按“从零到可访问”可复现；包含最小环境变量与常见故障排查
  - Touch points：`agent_docs/05_ops/single_binary_deployment.md`、`README.md`

- [ ] 3.3.2 SQLite 备份/恢复/升级 SOP（上线必备）
  - DoD：明确“升级前备份”“回滚恢复”“db:deploy 流程”“数据目录权限/磁盘策略”
  - Touch points：`agent_docs/05_ops/single_binary_deployment.md`（或新增 ops 文档）、`agent_docs/00_onboarding/setup.md`

- [ ] 3.3.3 观测与审计最低配置（上线可运维）
  - DoD：明确日志/追踪开关、Jaeger 可选接入、审计事件查询路径（UI/API）
  - Touch points：`agent_docs/05_ops/observability_jaeger.md`、`apps/server/src/modules/audit/*`、`apps/web/src/routes/_authenticated/system/*`

### 3.4 Track D — UX & Training（P1）

- [ ] 3.4.1 角色化操作手册（计划/工艺/质量/组长/操作员）
  - DoD：每个角色给出“入口→关键操作→常见异常→自助排查”；与现有权限/页面一致
  - Touch points：`user_docs/`、`apps/web/src/routes/_authenticated/mes/*`

- [ ] 3.4.2 上线演示脚本（现场演示顺序 + 讲解点）
  - DoD：形成 10~20 分钟可讲完的演示路线（包含失败分支示例与追溯展示）
  - Touch points：`user_docs/`、`domain_docs/mes/tests/01_acceptance_scenarios.md`

- [ ] 3.4.3 体验优化清单（仅收敛到 P1 阻断项）
  - DoD：收集并分级：P0 阻断 / P1 重要 / P2 可延后；每项绑定到具体页面与期望行为
  - Touch points：`apps/web/src/routes/_authenticated/mes/*`

- [ ] 3.4.4 外部集成降级 SOP（TPM/WMS/SPI/AOI/钢网/锡膏）
  - DoD：给出“不可用时怎么做/恢复后怎么切回/谁有权限操作/需要哪些审计记录”的明确步骤
  - Touch points：`user_docs/`、`apps/web/src/routes/_authenticated/mes/*`、`apps/server/src/modules/mes/integration/*`

### 3.5 Track E — Data Collection 配置（P0）

> 结论：**必须补齐**（工程师可配置采集点；不再依赖手工 seed/手输 ID）。

- [ ] 3.5.1 API: `DataCollectionSpec` CRUD（按 Operation 维度）
  - DoD：支持 list/filter（operation/name/isActive）、create/update/enable-disable；权限与审计明确
  - Touch points：`packages/db/prisma/schema/schema.prisma`、`apps/server/src/modules/mes/*`（新增模块）
  - Subtasks:
    - [ ] 3.5.1.1 Schema: `DataCollectionSpec` 模型与必要索引/关系
    - [ ] 3.5.1.2 Server: CRUD routes + schemas + service（含 filter/sort/pagination）
    - [ ] 3.5.1.3 RBAC/Audit: 权限常量 + 默认角色 + 审计事件
    - [ ] 3.5.1.4 Types: Eden types 回填与 API 客户端可用

- [ ] 3.5.2 Web: 采集项管理页（列表 + 新增/编辑对话框）
  - DoD：工程师可自助配置采集项（name/type/method/spec/alarm/isRequired/isActive）；可快速检索
  - Touch points：`apps/web/src/routes/_authenticated/mes/*`（新增路由/页面）
  - Subtasks:
    - [ ] 3.5.2.1 Web List: 列表/筛选/状态切换（enable-disable）
    - [ ] 3.5.2.2 Web Dialog: 新增/编辑（TanStack Form + Zod）
    - [ ] 3.5.2.3 UX: 表单校验与错误提示（与后端一致）

- [ ] 3.5.3 Web: 路由配置绑定体验升级（替换 `dataSpecIdsText` 手填）
  - DoD：路由配置页支持选择/移除采集项，并可按 Operation/Step 做绑定；保存后可编译进入 route snapshot
  - Touch points：`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`、`apps/server/src/modules/mes/routing/service.ts`
  - Subtasks:
    - [ ] 3.5.3.1 Web: 采集项选择器（按 Operation 分组/搜索）
    - [ ] 3.5.3.2 Server: compile 将绑定写入 snapshot（`dataSpecIds`）
    - [ ] 3.5.3.3 Guard: 未绑定/绑定缺失时给出可定位错误

- [ ] 3.5.4 Execution: 手工数据采集入口补齐（TrackOut 时录入）
  - DoD：执行页在 TrackOut 时按绑定的 specs 生成输入项并校验类型；缺必填项时阻断并提示（与后端一致）
  - Touch points：`apps/web/src/routes/_authenticated/mes/execution.tsx`、`apps/server/src/modules/mes/execution/schema.ts`
  - Subtasks:
    - [ ] 3.5.4.1 Web: TrackOut 对话框生成动态输入项（按 spec dataType）
    - [ ] 3.5.4.2 Server: `REQUIRED_DATA_MISSING` / `DATA_VALUE_INVALID` 错误可读且可定位

- [ ] 3.5.5 RBAC: 默认角色权限对齐（采集配置/采集录入）
  - DoD：engineer 可管理采集项；执行角色具备必要的数据采集能力；权限与 UI 入口一致
  - Touch points：`packages/db/src/permissions/permissions.ts`、`packages/db/src/permissions/preset-roles.ts`
  - Subtasks:
    - [ ] 3.5.5.1 Permissions: 新增/复用权限点并加入默认角色
    - [ ] 3.5.5.2 Web: 页面/按钮入口与权限一致（无权限不渲染或禁用）

---

## 4. Progress / Workflow Policy（契合本仓库工作流）

- 本文件是 M3 唯一进度入口：完成一项就勾选（`[x]`），执行中用 `[~]`。
- 每个 Track 的一个“最小闭环”作为一次小步提交（docs / seed+script / ops / ux），不要堆成一个大 PR。
- 任何范围调整/新增任务：先更新本文件，再改实现；并同步到 `conversation/` 记录决策。
- 完成 M3 前的基本检查：在将要合并的 worktree 上跑 `bun run lint`、`bun run check-types`。

---

## 5. References

- 计划：`domain_docs/mes/plan/01_milestones.md`
- M2 现状：`domain_docs/mes/plan/phase2_tasks.md`
- 验收用例：`domain_docs/mes/tests/01_acceptance_scenarios.md`
- 演示脚本：`apps/server/scripts/test-mes-flow.ts`
- 部署：`agent_docs/05_ops/single_binary_deployment.md`
