# Round 7: Execution UX（工位执行 / 进出站）

> Scope: Execution UX
>
> 目标：让 operator 在「选择工位/工序 → 进站（TrackIn）→ 数据采集/校验 → 出站（TrackOut）→ 推进到下一工序」上路径清晰、门禁一致、异常可恢复。

---

## 1. 轮次目标

- 基于端到端闭环与状态机，梳理“工位执行”的主线与异常路径（无权限/队列为空/API 报错/校验失败/不良处置），输出可复现证据与改进建议（不落实现）。

---

## 2. 覆盖范围（Scope）

- Scope：Execution UX
- 覆盖角色：operator（附：planner/quality 的只读核对视角）
- UI 页面（路径）：
  - `apps/web/src/routes/_authenticated/mes/execution.tsx`
- 关键 API：
  - `GET /api/stations/resolve-unit/:sn`（SN → run/wo）
  - `GET /api/stations/:stationCode/unit/:sn/data-specs`（TrackOut 采集项）
  - `POST /api/stations/:stationCode/track-in`
  - `POST /api/stations/:stationCode/track-out`
  - `GET /api/stations`（工位列表）
  - `GET /api/stations/:stationCode/queue`（在站队列）

---

## 3. 输入证据（按裁决顺序）

1. Spec：
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`（批量执行 LOOP：TrackIn/TrackOut/推进/不良处置）
   - `domain_docs/mes/spec/process/02_state_machines.md`（RunStatus/UnitStatus：QUEUED/IN_STATION/OUT_FAILED/DONE/ON_HOLD/SCRAPPED）
2. API：
   - `domain_docs/mes/tech/api/02_api_contracts_execution.md`
3. Permission：
   - `domain_docs/mes/permission_audit.md`
   - `packages/db/src/permissions/permissions.ts`
4. UI：
   - `apps/web/src/routes/_authenticated/mes/execution.tsx`
   - `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx`
   - `apps/web/src/hooks/use-station-execution.ts`
5. Backend（作为事实证据）：
   - `apps/server/src/modules/mes/station/routes.ts`
   - `apps/server/src/modules/mes/execution/routes.ts`
   - `apps/server/src/modules/mes/execution/service.ts`

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 执行页进入（页面门禁） | 已登录；具备 `exec:read` 或 `exec:track_in` / `exec:track_out` | 打开 `/mes/execution` | 能看到工位选择与执行面板；无权限时显示 NoAccessCard | - | - | `apps/web/src/routes/_authenticated/mes/execution.tsx` | - | - |
| 工位列表（选择工位） | `exec:read` / `exec:track_in` / `exec:track_out`；数据范围=ALL/ASSIGNED_* | 打开页面并选择工位（localStorage 记忆上次选择） | 展示工位名称/编码/所属产线；若无可用工位则提示“请联系管理员绑定” | - | `GET /api/stations`（按数据范围过滤） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | - | - |
| 工位队列（在站产品） | 已选择工位；具备执行查看权限 | 查看“当前队列”；点击刷新 | 展示 SN/当前步骤/下一步/进站时间；可直接“出站/报不良” | - | `GET /api/stations/:stationCode/queue`（take=50；由冻结 snapshot 推导 current/next step） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | UX/P2：队列为空时统一显示“当前工位没有在站产品”，难区分“确实为空” vs “工位不存在/无权限返回空队列” | 前端：区分 403/未知工位的提示（检查工位绑定/重新选择工位） |
| 根据 SN 自动补全 run/wo（进站/出站表单） | 后端要求同时具备 `exec:track_in` + `exec:track_out`；SN 已绑定 Unit | 在 SN 输入框扫描 SN（不含 wo/run） | 250ms 延迟后自动补全 woNo/runNo；失败时当前实现静默（不提示） | - | `GET /api/stations/resolve-unit/:sn`（权限：`[exec:track_in, exec:track_out]`） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | **业务逻辑/UX/P1**：页面允许“仅有 track_in 或 track_out 的用户”触发 resolve，但接口要求两者同时具备；且异常被 catch 忽略，用户无法理解为何未自动填充 | 前端：`canResolveUnit` 应与后端一致（需要两者）或调整后端权限；同时把 resolve 失败显式提示（含 UNIT_NOT_FOUND / FORBIDDEN） |
| 进站 TrackIn（主线） | Run=`AUTHORIZED`/`IN_PROGRESS`；或 Run=`PREP` 且试产门禁通过；`exec:track_in`；station 与 step 匹配 | 选择工位并点击“进站”（填写 runNo/woNo/sn） | 成功提示 + unit 状态变更 | Unit=`IN_STATION` | `POST /api/stations/:stationCode/track-in`（runNo/woNo/sn；校验 stationAllowed/lineMatch/stepMatch） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | - | - |
| 未授权/试产门禁不满足时尝试进站 | Run=`PREP` 且不满足试产门禁；或 Run 未授权；`exec:track_in` | 点击“进站” | toast 提示失败（需能区分“未授权 vs 试产未就绪/达上限/非首工序”） | - | `POST /api/stations/:stationCode/track-in`（`RUN_NOT_AUTHORIZED` / `FAI_TRIAL_NOT_READY` / `FAI_TRIAL_LIMIT_REACHED` / `FAI_TRIAL_STEP_NOT_ALLOWED`） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | UX/P2：当前失败反馈主要依赖 toast，缺少“为什么不能执行/下一步去哪”的结构化说明 | 前端/产品：对高频错误码做专门提示与跳转（Run 详情/FAI 页面） |
| 进站时 SN 未生成 Unit | Run 存在且已授权；SN 未生成 Unit | 填写 SN 并点击“进站” | toast 提示失败（建议包含“请先生成单件”） | - | `POST /api/stations/:stationCode/track-in`（`UNIT_NOT_FOUND`；message 建议“generate units first”） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | UX/P1：对 operator 而言“去哪里生成 Unit / 谁来生成”不明确（且通常无 `run:authorize` 权限） | 产品/前端：在错误提示中明确责任边界（由 planner 生成/授权），并提供“联系谁/去哪个页面”的指引 |
| Unit 上次出站失败（OUT_FAILED）再次尝试进站 | Unit=`OUT_FAILED` | 点击“进站” | toast 提示失败（disposition required） | - | `POST /api/stations/:stationCode/track-in`（`UNIT_OUT_FAILED`） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | 业务逻辑/UX/P1：执行页无“缺陷/处置”入口与说明，operator 易困惑为什么无法继续 | 产品/前端：在错误提示中指向 `/mes/defects`（质量处置）或相关流程说明；必要时在执行页增加只读的“缺陷状态”提示 |
| 出站 TrackOut 前获取采集项 | 已选择工位；`exec:track_out`；Unit 当前工序有 data specs | 点击“出站/报不良”打开对话框 | 展示采集项（必填/类型）；FAIL 时强制填写 defectCode；提交前做前端必填校验 | - | `GET /api/stations/:stationCode/unit/:sn/data-specs` | `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx` | UX/P1：采集项接口失败时对话框仍可进入并可提交（缺少明确错误态/禁用提交），容易反复碰壁 | 前端：为 specs 查询增加 error block（展示错误码/建议），未加载成功时禁用提交 |
| 出站 PASS（推进下一工序） | Run 允许执行；`exec:track_out`；存在 active TrackIn；采集项满足必填 | 选择 PASS 并提交 | 成功提示；若非末工序显示“已推进下一工序”，末工序提示“已完成” | Unit=`QUEUED`（非末工序）或 `DONE`（末工序） | `POST /api/stations/:stationCode/track-out`（result=PASS；校验必填 specs；推进 currentStepNo） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | - | - |
| 出站 FAIL（报不良） | Run 允许执行；`exec:track_out`；存在 active TrackIn | 点击“报不良”或选择 FAIL；填写 defectCode（必填）并提交 | 成功提示；Unit 进入 `OUT_FAILED`（待处置） | Unit=`OUT_FAILED` | `POST /api/stations/:stationCode/track-out`（result=FAIL；后端会自动创建 defect） | `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx` | UX/P1：成功后缺少“下一步去哪处置/谁来处置”的闭环提示，容易造成“报完不良就卡住” | 产品/前端：成功 toast 后追加引导（如“已生成缺陷，等待质量处置：/mes/defects”），并在队列/待进站提示 OUT_FAILED 不可继续原因 |
| 出站无 active TrackIn | Unit 未在该 station 进站；`exec:track_out` | 直接出站 | toast 提示失败，能明确“没有进站记录” | - | `POST /api/stations/:stationCode/track-out`（`TRACK_NOT_FOUND`） | `apps/web/src/routes/_authenticated/mes/execution.tsx` | UX/P2：手动出站入口默认可用，只有“未在当前队列中”的弱提示，易造成反复失败 | 前端：当 outUnitHint 为空时增加明确 warning；可选：禁用提交并引导从队列点击 |
| 出站 PASS 缺少必填采集项 | 当前 step 绑定了必填 specs；result=PASS | 未填必填项直接提交 | 前端应阻止提交；后端兜底返回可读错误 | - | `POST /api/stations/:stationCode/track-out`（`REQUIRED_DATA_MISSING`） | `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx` | - | - |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）
- [ ] **无 P0**：本轮未发现“主线无法闭环”的硬阻塞（TrackIn/TrackOut/队列/采集项查询均已具备）。
- [ ] **P1**：`resolve-unit` 的权限要求与执行页 gating 不一致，且失败被静默吞掉，导致扫描流在部分权限组合下“看起来坏了”。
  - 复现（权限不对齐场景）：给用户仅授予 `exec:track_in`（不授予 `exec:track_out`）→ 打开 `/mes/execution` 扫描 SN → 页面不提示任何错误，wo/run 不会自动补全。
  - 期望：权限不足/数据不存在时应明确提示；权限设计上也应允许“仅 TrackIn”角色完成必要的 SN 解析（或明确不支持并在 UI 中禁用）。
  - 证据：`apps/server/src/modules/mes/execution/routes.ts`（`GET /stations/resolve-unit/:sn` 需要 `[exec:track_in, exec:track_out]`）；`apps/web/src/routes/_authenticated/mes/execution.tsx`（`canResolveUnit = canTrackIn || canTrackOut` 且 catch ignore）。
  - 建议：对齐权限与 UI gating（两种方向任选其一：后端放宽 resolve 权限；或前端要求同时具备两者并把失败显式展示）。
  - 责任：后端 / 前端 / 权限定义
- [ ] **P1**：Unit=`OUT_FAILED` 后再次进站会报 `UNIT_OUT_FAILED`，但执行页缺少对“缺陷处置闭环”的解释与引导，容易造成“报完不良就卡住”的误解。
  - 复现：在 `/mes/execution` 对 SN “报不良” → Unit 变为 `OUT_FAILED` → 再次尝试进站 → 失败。
  - 期望：执行页能解释“该 Unit 需要质量处置后才能返工/放行”，并指向对应处置入口或流程说明。
  - 证据：`apps/server/src/modules/mes/execution/service.ts`（`UNIT_OUT_FAILED`）；`apps/web/src/routes/_authenticated/mes/execution.tsx`（仅 toast，无处置引导）。
  - 建议：TrackOut FAIL 成功后追加引导（如“已生成缺陷，等待质量处置：/mes/defects”）；TrackIn 遇到 `UNIT_OUT_FAILED` 时提示下一步。
  - 责任：产品 / 前端 / 文档

### 5.2 功能规划合理（信息架构/入口/边界）
- [ ] **P1**：执行页同时存在“选择批次/待进站列表”与“纯扫码手动录入”两套入口，但 operator 默认无 `run:read` 时前者不可用，页面心智模型容易摇摆。
  - 影响：新手 operator 可能以为必须“先选择批次”，但实际上只能扫码/手填 run/wo；出错率与培训成本上升。
  - 证据：`domain_docs/mes/permission_audit.md`（operator 无 `run:read`）；`apps/web/src/routes/_authenticated/mes/execution.tsx`（`canReadRun` 才展示“待执行批次/待进站列表/FAI 试产进度”）。
  - 建议：产品决策二选一并对齐实现：
    1) 赋予 operator 最小只读 run 信息能力（例如只读 run/wo 列表，或 exec 侧专用查询）；或
    2) 把执行页明确定位为“扫码优先”，弱化/隐藏批次相关 UI，并增强扫码解析与错误引导。
  - 责任：产品 / 权限定义 / 前端 / 后端
- [ ] **P2**：队列接口固定 `take=50` 且无分页/搜索，在高负载工位可能截断，进一步放大“手动出站”失败与误判。
  - 证据：`apps/server/src/modules/mes/station/routes.ts`（queue take=50）；`apps/web/src/hooks/use-station-execution.ts`（无分页/search）。
  - 建议：增加按 SN 搜索（server/client），或分页；至少在 UI 提示“只显示最近 50 条”。
  - 责任：后端 / 前端

### 5.3 UX（反馈/空态/错误/效率）
- [ ] **P1**：SN 自动解析失败完全静默（catch ignore），用户无法判断是“无权限/无数据/网络错误”，也无法得到下一步动作建议。
  - 证据：`apps/web/src/routes/_authenticated/mes/execution.tsx`（`scheduleResolveFromSn` 的 catch ignore）。
  - 建议：给出明确的解析状态（loading/失败原因）；失败时至少 toast + inline helper（含错误码与建议动作），并提供“手动解析”按钮（避免 250ms 触发的偶发误判）。
  - 责任：前端
- [ ] **P1**：TrackOutDialog 对采集项查询缺少 error 状态，失败时仍可提交（用户会反复碰壁）。
  - 证据：`apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx`（未读取 query error；`canSubmit` 不依赖 specs 是否加载成功）；`apps/web/src/hooks/use-station-execution.ts`（`useUnitDataSpecs` 可能抛出 `UNIT_NO_RUN` / `STEP_MISMATCH` 等）。
  - 建议：显示错误码/原因与可行动建议；未成功加载 specs 时禁用提交（或允许“无采集项 PASS”但需明确告知后端会校验）。
  - 责任：前端
- [ ] **P2**：出站“手动录入”在 SN 不在当前队列时仍可直接提交，仅有弱提示“未在当前队列中”，容易造成反复失败（`TRACK_NOT_FOUND`）。
  - 证据：`apps/web/src/routes/_authenticated/mes/execution.tsx`（out tab 允许直接打开对话框并提交）。
  - 建议：当 outUnitHint 为空时给出更强提示（warning/二次确认）；可选：禁用提交并引导从左侧队列操作。
  - 责任：前端
- [ ] **P2**：队列空态未区分“无权限/未知工位/确实为空”，影响排障效率。
  - 证据：`apps/server/src/modules/mes/station/routes.ts`（403 返回空队列/未知工位返回 name=未知）；`apps/web/src/routes/_authenticated/mes/execution.tsx`（统一空态文案）。
  - 建议：把“无权限/未知工位”转为可理解提示（例如提示检查工位绑定/重新选择工位）。
  - 责任：后端 / 前端

### 5.4 UI（一致性/组件规范）
- [ ] 本轮未发现需要单独立项的 UI 一致性问题（优先级低于门禁对齐与闭环引导）。

---

## 6. 建议与下一步（可执行但不实现）

- **优先对齐扫码链路（P1）**：统一 `resolve-unit` 的权限与前端 gating，并把解析失败显式可见（错误码 + 下一步指引）。
- **补齐“不良 → 处置”链路提示（P1）**：TrackOut FAIL 成功后引导去 `/mes/defects`；TrackIn 遇到 `UNIT_OUT_FAILED` 时给解释与跳转建议。
- **明确执行页心智模型（P1）**：决定“operator 是否需要 run 只读能力”；若不需要，调整页面文案/布局为扫码优先，并减少对 run 相关模块的依赖。
- **增强错误与空态（P2）**：队列/采集项查询增加错误态；队列截断给提示或提供搜索/分页；手动出站在不在队列时给强提示/限制。
