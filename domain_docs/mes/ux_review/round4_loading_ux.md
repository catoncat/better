# Round 4: Loading UX（上料防错体验）

> Scope: Loading UX
>
> 目标：把“加载站位表 → 扫码验证 → 错误/锁定/解锁 → 换料 → 记录追溯”的路径梳理到可理解、可恢复，并核对权限门禁与关键错误反馈是否支持一线作业闭环。

---

## 1. 轮次目标

- 以 SMT 上料防错 playbook 为基线，核对 `/mes/loading` 与 `/mes/loading/slot-config` 的信息呈现、动作门禁、异常恢复（锁定/解锁/换料）是否闭环；输出主线阻断点与可执行改进建议（不做实现）。

---

## 2. 覆盖范围（Scope）

- Scope：Loading UX
- 覆盖角色：material（扫码/换料/加载站位表）/ engineer（站位表配置）/ planner（从就绪检查跳转与交接）/ admin（只读排障）
- UI 页面（路径）：
  - `apps/web/src/routes/_authenticated/mes/loading/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`
  - `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx`
  - `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx`
  - `apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx`
  - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（readiness LOADING 失败项跳转入口）
- 关键 API：
  - 站位期望/记录：`GET /api/runs/:runNo/loading/expectations`、`GET /api/runs/:runNo/loading`
  - 加载站位表：`POST /api/runs/:runNo/loading/load-table`
  - 扫码验证/换料：`POST /api/loading/verify`、`POST /api/loading/replace`
  - 解锁：`POST /api/feeder-slots/:slotId/unlock`
  - 配置：`GET /api/lines`、`GET/POST/PUT/DELETE /api/lines/:lineId/feeder-slots`、`GET/POST/PUT/DELETE /api/slot-mappings`

---

## 3. 输入证据（按裁决顺序）

1. Spec/Playbook：
   - `domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md`
2. API：
   - `domain_docs/mes/tech/api/01_api_overview.md`
   - `apps/server/src/modules/mes/loading/routes.ts`（loading/slot-config 真实权限门禁）
   - `apps/server/src/modules/mes/loading/service.ts`（锁定阈值、幂等、错误码语义）
3. Permission：
   - `domain_docs/mes/permission_audit.md`
4. UI：
   - `apps/web/src/routes/_authenticated/mes/loading/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`
   - `apps/web/src/hooks/use-loading.ts`
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（`getReadinessItemAction` 对 LOADING 的跳转）

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 从 Run 详情的 readiness 失败项进入上料处理 | Run=PREP；readiness itemType=LOADING；具备 `loading:view` 或 `loading:config` | 在 `/mes/runs/:runNo` 点击“配置站位表 / 前往上料” | 跳转到 `/mes/loading/slot-config?lineId=...` 或 `/mes/loading?runNo=...`；无权限时按钮 disabled 并提示原因 | - | - | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | - | - |
| 打开上料防错页并选择 PREP 批次（happy path） | `run:read`；`loading:view` 或 `loading:verify` | 打开 `/mes/loading`，用选择器选 Run=PREP | 展示“扫码作业/站位状态/上料记录”；无 `run:read` 直接 NoAccessCard | - | `GET /api/runs`、`GET /api/runs/:runNo` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` | - | - |
| 初始化站位表（happy path） | Run=PREP；`loading:verify`；expectations 为空 | 点击“加载站位表” | toast“站位表加载成功”；站位状态表出现 N 行 | 创建 RunSlotExpectation（PENDING） | `POST /api/runs/:runNo/loading/load-table` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` + `apps/web/src/hooks/use-loading.ts` | - | - |
| 初始化站位表失败（异常：缺映射/已开始上料/状态不对） | 1) 缺 SlotMaterialMapping；或 2) 已有 LoadingRecord；或 3) Run!=PREP | 点击“加载站位表” | toast“站位表加载失败”；无进一步指引 | - | 错误码示例：`SLOT_MAPPING_MISSING` / `LOADING_ALREADY_STARTED` / `RUN_STATUS_INVALID` | `apps/server/src/modules/mes/loading/service.ts` + `apps/web/src/hooks/use-loading.ts` | UX/P1：失败缺少“可执行定位信息”（缺哪个 slot、应去 slot-config 还是找谁处理），现场排障成本高 | 产品/前端：对常见错误码做可执行提示（缺映射列表/跳转 slot-config + lineId/Run 状态解释） |
| 扫码验证 PASS（happy path） | expectation.status=PENDING；扫码物料=expected；`loading:verify` | 在 ScanPanel 输入 slotCode + 条码，点“验证上料” | toast“上料验证通过”；站位状态变“已上料”；历史出现一条“上料”记录 | expectation=LOADED；slot.failedAttempts=0 | `POST /api/loading/verify`（返回 `verifyResult=PASS`） | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` + `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx` + `apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx` | - | - |
| 扫码验证 WARNING（替代料） | expectation.status=PENDING；扫码物料在 alternates；`loading:verify` | 扫码替代料条码 | toast“上料验证警告”；站位仍变“已上料” | expectation=LOADED；记录 verifyResult=WARNING | `POST /api/loading/verify`（`verifyResult=WARNING`） | `apps/web/src/hooks/use-loading.ts` | UX/P2：SlotList 仅显示“已上料”，未区分 PASS/WARNING，后续排查“用了替代料”需要翻历史（且历史不显示 verifyResult） | 产品/前端：在站位行或历史中展示 verifyResult（PASS/WARNING）与替代料提示 |
| 扫码验证 FAIL（不匹配） | expectation.status=PENDING；扫码物料不匹配；`loading:verify` | 扫码错误物料条码 | SlotList 状态变“错误”；但无明确 toast（仅 UI 状态变化） | expectation=MISMATCH；slot.failedAttempts+1；可能触发锁定 | `POST /api/loading/verify`（200 返回 `verifyResult=FAIL` + failReason） | `apps/web/src/hooks/use-loading.ts`（onSuccess 未覆盖 FAIL toast） + `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx` | UX/P1：FAIL 走 200 响应但无 toast/无 failReason 展示，用户难以快速理解“期望 vs 扫到什么”，尤其在多站位连续作业时 | 前端：对 `verifyResult=FAIL` 给明确反馈（toast + 展示 failReason/期望物料） |
| 连续错误 3 次触发锁定（异常恢复） | 同一 slot 连续 mismatch；达到锁定阈值；`loading:verify` | 第 3 次扫错继续验证 | 后端返回 409 `SLOT_LOCKED`；toast“站位已锁定”；SlotList 出现解锁按钮（需权限） | slot.isLocked=true；lockedReason 写入 | `POST /api/loading/verify` → 409 `SLOT_LOCKED`；解锁 `POST /api/feeder-slots/:slotId/unlock` | `apps/web/src/hooks/use-loading.ts`（SLOT_LOCKED 特判） + `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx` | UX/P2：UI 未展示锁定原因/失败次数，且解锁理由固定为“Manual Unlock”，审计价值弱 | 产品/前端：解锁弹窗收集 reason（必填），并展示 failedAttempts/lockedReason |
| 已上料后扫到不同物料（异常：需换料） | expectation.status=LOADED；再次扫描不同 material；`loading:verify` | 继续用“验证上料”扫新条码 | 后端返回 409 `SLOT_ALREADY_LOADED`；UI 提示“上料验证失败”但不引导下一步 | - | `POST /api/loading/verify` → 409 `SLOT_ALREADY_LOADED` | `apps/server/src/modules/mes/loading/service.ts` + `apps/web/src/hooks/use-loading.ts` | 业务逻辑/P1：错误码语义是“必须走换料”，但 UI 缺少一键切换到换料模式/提示“请切换换料模式并填写原因” | 前端：对 `SLOT_ALREADY_LOADED` 给操作型提示（并可自动打开/切换换料模式） |
| 换料（happy path） | expectation.status=LOADED；`loading:verify`；reason 必填 | 在 ScanPanel 打开“换料模式”，填原因，提交 | toast“换料成功”；历史出现新记录；旧 LOADED 记录变 REPLACED | LoadingRecord: REPLACED + 新 LOADED；expectation.loadedMaterialCode 更新 | `POST /api/loading/replace`（reason 必填） | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` + `apps/server/src/modules/mes/loading/service.ts` | - | - |
| 站位表配置页的进入与产线选择（异常：权限组合导致无法配置） | 需要配置站位/映射；具备 `loading:config`（工程/配置角色常见）但可能缺 `loading:view`；或仅有 `run:read` | 打开 `/mes/loading/slot-config` 或从 readiness 跳转进入 | 现状：页面级 `loading:view` gate；且产线列表 gate= `run:read` && `run:create`（UI） | 配置入口被阻断→无法建立 feeder-slots/mappings→load-table 无法进行 | 服务器：`GET /api/lines` 允许 `run:read`（或其它任一权限）访问；站位/映射列表需要 `loading:view`；增删改需要 `loading:config` | `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx` + `apps/server/src/plugins/permission.ts` + `apps/server/src/modules/mes/line/routes.ts` | 业务逻辑/P0：配置角色可能“有 config 但无 view / 无 run:create”导致进不去或无法选产线，直接阻断上料主线（站位表无法配置） | 产品/权限/前端：对齐“配置者”权限模型（至少允许 config 进入页面并选择产线；或给 engineer 补 `loading:view`，并放宽 line list gate 为 run:read） |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P0**：`/mes/loading/slot-config` 的权限门禁与角色职责不匹配：页面强依赖 `loading:view`，且 UI 端产线列表 gate 为 `run:read && run:create`，导致“有 `loading:config` 的配置角色”也可能无法进入/无法选产线，从而无法配置站位/映射，最终阻断上料主线。
  - 证据：`domain_docs/mes/permission_audit.md`（engineer 具备 `loading:config`、/lines requirePermission 为 OR）、`apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`、`apps/server/src/plugins/permission.ts`、`apps/server/src/modules/mes/line/routes.ts`
- [ ] **P1**：`SLOT_ALREADY_LOADED` 的语义是“必须换料”，但 UI 仅提示“上料验证失败”，缺少可执行引导（切换换料模式 + reason）。
  - 证据：`apps/server/src/modules/mes/loading/service.ts`（409 `SLOT_ALREADY_LOADED`）、`apps/web/src/hooks/use-loading.ts`（onError 未对该码给动作提示）、`apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx`

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P1**：加载站位表失败时缺少“定位与修复入口”：比如 `SLOT_MAPPING_MISSING` 未提示缺哪些 slot、应去 slot-config 还是找哪个角色处理。
  - 证据：`apps/server/src/modules/mes/loading/service.ts`（缺映射报错带 slotCode 列表）、`apps/web/src/hooks/use-loading.ts`（统一 showError）、`domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md`

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P1**：扫码验证 FAIL 走 200 响应，但缺少 toast/缺少 failReason 展示；用户只能从 SlotList “错误”状态猜测原因，难以快速纠错。
  - 证据：`apps/server/src/modules/mes/loading/service.ts`（verifyResult=FAIL + failReason）、`apps/web/src/hooks/use-loading.ts`（onSuccess 未覆盖 FAIL）
- [ ] **P2**：锁定/解锁体验偏“运维式”：不展示 failedAttempts/lockedReason；解锁 reason 固定为“Manual Unlock”，无法满足审计与现场复盘。
  - 证据：`domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md`（锁定/解锁规则）、`apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx`、`apps/web/src/hooks/use-loading.ts`
- [ ] **P2**：替代料 WARNING 在站位列表与历史记录中不可见（SlotList 只显示“已上料”，History 只显示“上料/异常/已换料”），对“替代料使用”追溯不友好。
  - 证据：`apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx`、`apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx`

### 5.4 UI（一致性/组件规范）

- [ ] **P2**：LoadingHistory 当前列缺少 verifyResult/failReason，且 “暂无换料记录” 文案与实际含义不一致（同时承载“上料/换料记录”）。
  - 证据：`apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx`

---

## 6. 建议与下一步（可执行但不实现）

- 对齐“配置者”权限与入口：让拥有 `loading:config` 的用户能进入并完成站位表配置（至少能选择产线、查看现有配置），并放宽 line list gate（避免 UI 端 `RUN_READ && RUN_CREATE` 过度收紧）。  
- 针对关键错误码做“动作型引导”：`SLOT_ALREADY_LOADED` → 引导换料模式；`SLOT_MAPPING_MISSING` → 展示缺失 slot 列表并给直达配置入口。  
- 提升一线反馈密度：对 `verifyResult=FAIL` 提示 failReason；对 WARNING 标注替代料；对锁定展示次数/原因并收集解锁 reason。  

