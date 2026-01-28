# Round 1: Core Execution（核心执行闭环）

> Scope: Core Execution
> 
> 目标：把“工单 → 批次 → 准备检查/上料/FAI → 执行 → 收尾/OQC → 追溯”的**主线闭环**，在多角色协作与权限门禁下梳理到“可理解、可推进、异常可恢复”。

---

## 1. 轮次目标

- 以 `Work Orders → Runs → Run Detail → Loading/FAI/Execution → Closeout/OQC → Trace` 为主线，验证关键门禁与“下一步”引导是否闭环，并输出高风险阻断点（P0/P1）。

---

## 2. 覆盖范围（Scope）

- Scope：Core Execution
- 覆盖角色：planner / operator / material / quality（以及 admin/trace 的只读场景）
- UI 页面（路径）：
  - `apps/web/src/routes/_authenticated/mes/work-orders.tsx`
  - `apps/web/src/routes/_authenticated/mes/runs/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
  - `apps/web/src/routes/_authenticated/mes/loading/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/execution.tsx`
  - `apps/web/src/routes/_authenticated/mes/fai.tsx`
  - `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/trace.tsx`
- 关键 API（按主线）：
  - 工单/批次：`GET /api/work-orders`、`POST /api/work-orders/:woNo/release`、`POST /api/work-orders/:woNo/runs`、`GET /api/runs`、`GET /api/runs/:runNo`
  - 就绪检查：`POST /api/runs/:runNo/readiness/precheck`、`GET /api/runs/:runNo/readiness/latest`、`POST /api/runs/:runNo/readiness/items/:itemId/waive`
  - 上料：`GET /api/runs/:runNo/loading/expectations`、`POST /api/runs/:runNo/loading/load-table`、`POST /api/loading/verify`、`POST /api/loading/replace`
  - 执行：`GET /api/stations/:stationCode/queue`、`POST /api/stations/:stationCode/track-in`、`POST /api/stations/:stationCode/track-out`
  - FAI/OQC：`GET/POST /api/fai/run/:runNo*`、`GET/POST /api/oqc/run/:runNo*`
  - 收尾/追溯：`POST /api/runs/:runNo/close`、`GET /api/trace/units/:sn`

---

## 3. 输入证据（按裁决顺序）

1. Spec：
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`
   - `domain_docs/mes/spec/process/02_state_machines.md`
2. API：
   - `domain_docs/mes/tech/api/01_api_overview.md`
3. Permission：
   - `domain_docs/mes/permission_audit.md`
4. UI：
   - `apps/web/src/routes/_authenticated/mes/work-orders.tsx`
   - `apps/web/src/routes/_authenticated/mes/runs/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
   - `apps/web/src/routes/_authenticated/mes/loading/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/execution.tsx`
   - `apps/web/src/routes/_authenticated/mes/trace.tsx`
5. 实现级关键约束（用于验证 UX 是否反映后端门禁）：
   - `apps/server/src/modules/mes/run/service.ts`（`authorizeRun` / `closeRun`）
   - `apps/server/src/modules/mes/oqc/trigger-service.ts`（`checkAndTriggerOqc`）

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 查看工单列表（筛“可开工”） | `wo:read` | 打开 `/mes/work-orders`，使用系统预设筛选 | 列表刷新；若无权限显示 NoAccessCard | - | `GET /api/work-orders` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx` | - | - |
| 发布工单（RECEIVED→RELEASED） | WO=RECEIVED；`wo:release` | 在工单卡片/表格中点“发布/派工”，提交弹窗 | 成功 toast；列表状态更新 | WO=RELEASED | `POST /api/work-orders/:woNo/release` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx` | - | - |
| 为工单创建批次并跳转详情（happy path） | WO=RELEASED；`run:create`；路由版本可用 | 点“创建批次”→选择产线等→提交 | 成功 toast + 跳转 `/mes/runs/:runNo` | Run=PREP；WO=IN_PROGRESS（Spec 语义） | `POST /api/work-orders/:woNo/runs` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx` | - | - |
| 批次详情：执行就绪检查/查看失败项并“去处理” | Run=PREP；`readiness:view` + `readiness:check` | 在 `/mes/runs/:runNo` 点击刷新/执行检查；对 FAILED 项点击“配置站位表/前往上料”等 | 展示检查类型/汇总/条目；提供“豁免/去处理”入口；无权限显示 NoAccessCard | ReadinessLatest 更新；失败项可 WAIVE | `POST /api/runs/:runNo/readiness/precheck`、`GET /api/runs/:runNo/readiness/latest`、`POST /api/runs/:runNo/readiness/items/:itemId/waive` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | 功能规划/P1：当“去处理”按钮因缺权限被禁用时，仅提示“无权限…”，缺少“应由哪个角色处理 + 如何交接 runNo/line”的引导（多角色协作高频） | 产品/前端：在 disabledReason 下补充角色建议与可复制上下文（runNo/line/失败项） |
| 上料页：选择批次→加载站位表→扫码验证 | `run:read`；`loading:view`/`loading:verify`；Run=PREP | 打开 `/mes/loading?runNo=...` 或手动选择批次；期望缺失时点“加载站位表”；扫码验证/换料 | 站位表未加载时展示初始化卡；无 `loading:verify` 显示 NoAccessCard；展示站位状态与历史 | 站位期望生成/更新；产生 LoadingRecord | `POST /api/runs/:runNo/loading/load-table`、`GET /api/runs/:runNo/loading/expectations`、`POST /api/loading/verify` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` | - | - |
| 批次详情：FAI Gate（创建/试产/判定/签字） | Run=PREP；`quality:fai`；可能 requiresFai=true | 在 `/mes/runs/:runNo` 创建并开始试产；进入 `/mes/execution` 完成试产；回到 `/mes/fai` 记录/判定/签字 | 流程进度卡显示“首件检验”状态；授权按钮展示阻断原因（需 FAI/签字） | FAI=PENDING/INSPECTING/PASS；Gate 状态变化 | `GET /api/fai/run/:runNo/gate`、`POST /api/fai/run/:runNo`、`POST /api/fai/:faiId/*` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`、`apps/web/src/routes/_authenticated/mes/fai.tsx` | UX/P2：试产/FAI/授权三处 CTA（试产执行、开始执行、授权生产）信息量大，新手易混淆“试产 vs 正式生产” | 产品/前端：在 PREP 阶段强化标签（试产阶段/正式阶段），并统一“下一步”入口 |
| 批次授权（PREP→AUTHORIZED） | Run=PREP；`run:authorize`；Readiness=PASSED；FAI gate satisfied | 点“授权生产” | 成功 toast；状态 Badge 变为 AUTHORIZED | Run=AUTHORIZED | `POST /api/runs/:runNo/authorize`（后端强制：readiness 必须通过 + FAI 必须通过/签字） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` + `apps/server/src/modules/mes/run/service.ts` | 业务逻辑/P1：授权按钮的 UI 阻断原因依赖 `readiness:view`（无 view 时不会提前提示/禁用），会导致“点了才失败”（READINESS_CHECK_FAILED） | 前端/产品：即使无 `readiness:view` 也应提示“需通过就绪检查（无权限查看）”，或要求授权者具备 view 权限 |
| 工位执行（TrackIn/TrackOut + 队列/待进站） | `exec:track_in`/`exec:track_out`；工位已绑定；Run=AUTHORIZED 或 FAI 试产（PREP） | 在 `/mes/execution` 选择工位；扫码/输入 SN；TrackIn/TrackOut；查看队列 | 队列/待进站列表刷新；无权限显示 NoAccessCard；无绑定工位提示联系管理员 | Unit=IN_STATION/QUEUED/DONE/OUT_FAILED；Run 首次 TrackIn 后 IN_PROGRESS（Spec） | `POST /api/stations/:stationCode/track-in`、`POST /api/stations/:stationCode/track-out` | `apps/web/src/routes/_authenticated/mes/execution.tsx` | UX/P2：SN resolve 失败被静默忽略（catch 空处理），用户可能误以为系统无反应 | 前端：对 resolve 失败给出轻提示（不阻断），并保留手输路径 |
| 收尾：未满足条件/触发 OQC（异常路径） | Run=IN_PROGRESS；`run:close`；后端要求“全部 Unit 终态 (DONE/SCRAPPED)”；可能触发抽检规则 | 在 `/mes/runs/:runNo` 点击“收尾”确认 | 当前实现：统一 toast “收尾失败”；即使 OQC 已创建也以失败呈现 | 1) 未终态：无变化；2) 触发 OQC：OQC task 创建但 Run 仍 IN_PROGRESS（等待 OQC） | `POST /api/runs/:runNo/close`（错误码：`RUN_UNITS_NOT_TERMINAL`、`OQC_REQUIRED`(409)） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` + `apps/web/src/hooks/use-runs.ts` + `apps/server/src/modules/mes/run/service.ts` | 业务逻辑/P0：`OQC_REQUIRED` 是“下一步必须做 OQC”，但被当成“收尾失败”；缺少明确交接/入口，主线高概率卡死或误判流程异常 | 产品/前端：将 `OQC_REQUIRED` 视为状态转移提示（例如“已创建 OQC，等待质量完成”），在 Run 详情展示 OQC 任务信息与可跳转入口（可考虑只读展示给非质量角色） |
| 追溯查询（空态/错误/无权限） | `trace:read` | 在 `/mes/trace` 输入/扫描 SN 查询；切换 run/latest 模式 | 正常：展示 unit/route/track 记录；空态：暂无执行记录；无权限显示 NoAccessCard；API 错误显示可执行错误提示 | - | `GET /api/trace/units/:sn` | `apps/web/src/routes/_authenticated/mes/trace.tsx` | - | - |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P0**：Run 收尾遇到 `OQC_REQUIRED` 被当成“收尾失败”，缺少明确下一步与跨角色交接，主线高概率卡死/误判。
  - 现状：`useCloseRun` 对 `OQC_REQUIRED` 仅 invalidate OQC query，仍走 `showError("收尾失败")`；UI 未提供“已创建 OQC 任务”的稳定入口（toast 信息易丢）。
  - 证据：`domain_docs/mes/spec/process/01_end_to_end_flows.md`、`apps/server/src/modules/mes/run/service.ts`、`apps/server/src/modules/mes/oqc/trigger-service.ts`、`apps/web/src/hooks/use-runs.ts`、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- [ ] **P1**：Run 收尾按钮缺少“可收尾”前置校验与原因提示（全部 Unit 终态/无 Unit），用户只能点了才报错。
  - 证据：`domain_docs/mes/spec/process/01_end_to_end_flows.md`、`domain_docs/mes/spec/process/02_state_machines.md`、`apps/server/src/modules/mes/run/service.ts`（`RUN_UNITS_NOT_TERMINAL` / `RUN_HAS_NO_UNITS`）、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- [ ] **P1**：授权按钮的阻断原因依赖 `readiness:view`（无 view 时不提前阻断），导致“点了才失败”（READINESS_CHECK_FAILED），体验上像系统不稳定。
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（authorizeBlockedReason 条件）、`apps/server/src/modules/mes/run/service.ts`（authorize 强制 readiness + FAI gate）、`domain_docs/mes/spec/process/01_end_to_end_flows.md`

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P1**：Run 详情的 readiness “去处理”在缺权限时仅提示“无权限…”，但未明确“应由哪个角色在何页面处理”与交接信息（runNo/line/失败项）。
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（getReadinessItemAction disabledReason）、`domain_docs/mes/permission_audit.md`（planner vs material/engineer 权限差异）

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P2**：Execution 页 SN resolve 失败静默（catch 空处理），用户容易误以为系统无响应。
  - 证据：`apps/web/src/routes/_authenticated/mes/execution.tsx`（resolveUnitBySn catch 逻辑）、`domain_docs/mes/tech/api/01_api_overview.md`（execution 相关错误码提示方向）
- [ ] **P2**：Execution 页“待执行批次”混合展示 PREP/AUTHORIZED/IN_PROGRESS，未在卡片层解释“PREP=试产可执行但非正式生产”，易造成误解。
  - 证据：`apps/web/src/routes/_authenticated/mes/execution.tsx`（run status 标签）、`domain_docs/mes/spec/process/01_end_to_end_flows.md`（FAI 在授权前）、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（FAI 试产规则展示）

### 5.4 UI（一致性/组件规范）

- [ ] **P2**：核心页面标题字号层级不一致（例如 trace 为 `text-3xl`，其余多为 `text-2xl`），可能影响整体信息层级一致性。
  - 证据：`apps/web/src/routes/_authenticated/mes/trace.tsx`、`apps/web/src/routes/_authenticated/mes/work-orders.tsx`

---

## 6. 建议与下一步（可执行但不实现）

- 将 Run 收尾拆成显式状态机提示：`可收尾` / `等待 OQC` / `不可收尾（原因）`，并把 `OQC_REQUIRED` 视为“创建任务成功 + 下一步指引”，而不是失败。
- 在 Run 详情为跨角色步骤提供“交接包”：可复制 runNo/line/失败项摘要；必要时加“通知/指派”（后续由 /next 或 /dev 承接）。
- Execution 页区分“试产执行（PREP）”与“正式执行（AUTHORIZED/IN_PROGRESS）”的入口与文案，降低误操作风险。

