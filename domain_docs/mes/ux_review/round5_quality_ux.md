# Round 5: Quality UX（质量体验）

> Scope: Quality UX
>
> 目标：让质量角色在 **FAI / FQC / OQC / MRB / OQC 抽检规则** 相关路径上“可理解、可推进、异常可恢复”，并且与 planner/operator 的交接不会把主线卡死。

---

## 1. 轮次目标

- 对齐 Spec（FAI→授权→执行→收尾→OQC/MRB）与现有 UI/权限门禁的真实行为，补齐质量侧关键路径的解释与入口。
- 重点评审：抽检规则入口是否可用、OQC/MRB 的闭环是否清晰、FAI “试产数据→判定→签字”的信息是否足够支撑决策。

---

## 2. 覆盖范围（Scope）

- Scope：Quality UX
- 覆盖角色：quality（主）、planner（收尾触发与交接）、operator/material（被动查看与协作）
- UI 页面（路径）：
  - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（Run 详情：FAI/OQC 状态卡 + MRB 入口）
  - `apps/web/src/routes/_authenticated/mes/fai.tsx`
  - `apps/web/src/routes/_authenticated/mes/fqc/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`
  - `apps/web/src/routes/_authenticated/mes/oqc/-components/rule-dialog.tsx`
  - `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx`
- 关键 API（按流程闭环）：
  - FAI：`GET /api/fai/run/:runNo`、`GET /api/fai/run/:runNo/gate`、`POST /api/fai/run/:runNo`、`POST /api/fai/:faiId/start`、`POST /api/fai/:faiId/items`、`POST /api/fai/:faiId/complete`、`POST /api/fai/:faiId/sign`
  - FQC：`GET /api/fqc`、`GET /api/fqc/run/:runNo`、`POST /api/fqc/run/:runNo`、`POST /api/fqc/:fqcId/start`、`POST /api/fqc/:fqcId/items`、`POST /api/fqc/:fqcId/complete`、`POST /api/fqc/:fqcId/sign`
  - OQC：`GET /api/oqc`、`GET /api/oqc/run/:runNo`、`GET /api/oqc/run/:runNo/gate`、`POST /api/oqc/:oqcId/start`、`POST /api/oqc/:oqcId/items`、`POST /api/oqc/:oqcId/complete`
  - OQC 抽检规则：`GET/POST/PATCH/DELETE /api/oqc/sampling-rules*`
  - MRB：`POST /api/runs/:runNo/mrb-decision`
  - 依赖能力（质量路径会碰到的前置）：`POST /api/runs/:runNo/close`、`POST /api/runs/:runNo/generate-units`

---

## 3. 输入证据（按裁决顺序）

1. Spec：
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`（FAI→授权→执行→收尾→OQC/MRB）
2. API：
   - `domain_docs/mes/tech/api/01_api_overview.md`
   - `domain_docs/mes/tech/api/03_api_contracts_quality.md`
3. Permission：
   - `domain_docs/mes/permission_audit.md`
4. UI（关键实现证据）：
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
   - `apps/web/src/routes/_authenticated/mes/fai.tsx`
   - `apps/web/src/routes/_authenticated/mes/fqc/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`
   - `apps/web/src/routes/_authenticated/mes/oqc/-components/rule-dialog.tsx`
5. 关键后端约束（用于判断 UI 是否能解释“为什么被 gate”）：
   - `apps/server/src/modules/mes/run/service.ts`（`closeRun` → `OQC_REQUIRED`）
   - `apps/server/src/modules/mes/fai/service.ts`（`createFai` 依赖 readiness FORMAL；`startFai` 依赖 units）
   - `apps/server/src/modules/mes/line/routes.ts`（`GET /api/lines` 的 requirePermission 语义）

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 在 Run 详情查看 FAI/OQC 状态（只读） | `run:read`；质量可选 `quality:fai/oqc` | 打开 `/mes/runs/:runNo` | 显示流程进度卡 + FAI 卡 + OQC 卡；无权限显示 NoAccessCard 占位 | - | `GET /api/fai/run/:runNo` + `/gate`（可选）<br>`GET /api/oqc/run/:runNo`（可选） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | UX/P2：从 Run 详情“查看详情/查看列表”跳转到 `/mes/fai`、`/mes/oqc` 未携带 `runNo` 过滤，质量需要二次搜索 | 前端：跳转时带 `search: { runNo }` 或提供“复制 runNo/一键筛选” |
| 创建并开始 FAI（happy path） | Run=PREP；`quality:fai`；readiness 已通过（或可执行检查） | 在 Run 详情点击“创建并开始试产”→输入抽样数→确认 | 创建成功后自动 start；FAI 卡变更为“进行中”，可“进入试产执行” | FAI=PENDING→INSPECTING | `POST /api/fai/run/:runNo`（服务端会确保 readiness FORMAL PASSED）<br>`POST /api/fai/:faiId/start` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（FAI Creation Dialog） | - | - |
| 创建 FAI 遇到样本不足（异常路径：需要生成单件） | Run=PREP；`quality:fai`；`unitStats.total < sampleQty`；生成单件需 `run:authorize` | 点击创建 FAI → 系统提示“先生成单件”并弹出生成单件对话框 | 对话框可输入生成数量并提交；无权限时会在提交时报 403 toast | Unit 生成（QUEUED）；随后继续创建并 start FAI | `POST /api/runs/:runNo/generate-units`（权限）<br>`POST /api/fai/run/:runNo` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（Generate Units Dialog） | 业务逻辑/P1：对质量角色（通常无 `run:authorize`）来说，“生成单件”是必经依赖但缺明确交接；且弹窗不做权限前置说明，容易“点了才失败” | 产品/前端：在弹窗/CTA 上明确“需 planner 授权/生成单件”，并在无权限时提供可复制交接信息（runNo/缺口数量） |
| FAI 试产数据不足（异常路径：为什么“不能判定/签字”） | FAI=INSPECTING；试产需 TrackIn/TrackOut；质量有 `quality:fai` | 在 `/mes/fai` 打开某条 FAI 详情，查看“试产单位/TrackOut 采集结果/SPI/AOI 记录” | 若无试产记录显示“暂无试产记录/暂无采集数据/暂无 SPI/AOI 记录” | - | `GET /api/fai/:faiId`（trialSummary） | `apps/web/src/routes/_authenticated/mes/fai.tsx` | UX/P1：空态只说“暂无”，没告诉“缺什么/去哪补”（例如需去 `/mes/execution` 做首工序 TrackIn/TrackOut） | 前端：空态增加“缺口解释 + 跳转执行页”按钮（带 runNo/woNo） |
| 记录 FAI 检验项（模板/手动） | FAI=INSPECTING；`quality:fai`；模板可选需要 Data Spec 权限 | 在 FAI 列表点击“记录”→选择采集项模板或手动填→保存 | 成功 toast；详情/列表刷新；模板会填充 itemName/itemSpec | 写入检验项 | `POST /api/fai/:faiId/items`<br>模板来源：`GET /api/data-collection-specs` | `apps/web/src/routes/_authenticated/mes/fai.tsx` + `apps/web/src/hooks/use-data-collection-specs.ts` | 业务逻辑/P1：前端模板 gating 使用 `DATA_SPEC_READ && DATA_SPEC_CONFIG`（AND），但后端多处 requirePermission 数组为 OR 语义（任一即可）；易造成“实际有权限但 UI 不给用” | 前端/后端：统一 permission 语义（建议前端按“可访问 API 的最小权限” gate），或将 Data Spec 改为 read/config 分离并提供只读使用 |
| 完成 FAI 判定 | FAI=INSPECTING；`quality:fai`；失败需填 failedQty | 在 FAI 列表点击“完成”→选择 PASS/FAIL→提交 | PASS/FAIL 状态更新；Run 详情会提示“需签字后才能授权量产” | FAI→PASS/FAIL | `POST /api/fai/:faiId/complete` | `apps/web/src/routes/_authenticated/mes/fai.tsx` + `apps/web/src/hooks/use-fai.ts` | - | - |
| FAI 签字（授权门禁的最后一步） | FAI=PASS；未签字；`quality:fai` | 在 Run 详情的 FAI 卡点击“签字确认”→提交备注 | 成功后显示签字时间与备注；授权阻断原因解除 | FAI 签字完成 | `POST /api/fai/:faiId/sign` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` | UX/P2：签字入口仅在 Run 详情，不在 `/mes/fai`（质量需要在两处切换完成闭环） | 前端：在 `/mes/fai` 为 PASS 未签字状态提供“签字”操作或显式引导“去 Run 详情签字” |
| 创建并执行末件检验（FQC） | Run 状态满足创建约束；权限：当前实现为 `QUALITY_FAI` | `/mes/fqc` 点击“创建末件检验”→输入 runNo/sampleQty→创建→开始→录入→完成→签字 | 列表/卡片状态流转：PENDING→INSPECTING→PASS/FAIL→（PASS 后待签字） | FQC 状态更新（不改变 Run 状态） | `POST /api/fqc/run/:runNo`、`POST /api/fqc/:fqcId/start`、`POST /api/fqc/:fqcId/items`、`POST /api/fqc/:fqcId/complete`、`POST /api/fqc/:fqcId/sign` | `apps/web/src/routes/_authenticated/mes/fqc/index.tsx` + `apps/web/src/routes/_authenticated/mes/-components/fqc-*.tsx` | 功能规划/P2：FQC 与主线状态无强绑定，但入口完全独立（手输 runNo）；缺少从 Run 详情“快速创建/查看本 Run 的 FQC” | 产品/前端：在 Run 详情增加只读状态卡 + 快捷入口（可延后实现） |
| 收尾触发 OQC_REQUIRED（P0：跨角色交接断点） | Run=IN_PROGRESS；Unit 全部终态；触发 OQC 抽检规则 | planner 在 Run 详情点“收尾” | 当前 toast 走“收尾失败”；但后端已创建 OQC 任务；质量需要另行进入 OQC 列表搜索 runNo | 产生 OQC；Run 仍 IN_PROGRESS（等待 OQC 完成） | `POST /api/runs/:runNo/close`（`OQC_REQUIRED`）<br>`GET /api/oqc/run/:runNo` | `apps/web/src/hooks/use-runs.ts` + `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` + `apps/server/src/modules/mes/run/service.ts` | 业务逻辑/P0：`OQC_REQUIRED` 是“下一步必须做 OQC”而不是失败；当前反馈会误导并导致跨角色协作卡死（质量不知道被触发/从哪开始） | 产品/前端：将 `OQC_REQUIRED` 视为“已创建 OQC + 下一步指引”，在 Run 详情展示可点击入口（对非质量只读提示即可） |
| 执行 OQC 抽检与完成（异常：样本 SN 校验） | OQC=INSPECTING；`quality:oqc`；抽样 SN 集合由系统决定 | 在 `/mes/oqc` 开始检验→“录入检验项”输入 unitSn→提交→完成 PASS/FAIL | 若 unitSn 不在样本内后端返回 `UNIT_NOT_IN_SAMPLE`；前端 toast 展示 fallback + code（可能不够可执行） | OQC PASS→Run COMPLETED；OQC FAIL→Run ON_HOLD（进入 MRB） | `POST /api/oqc/:oqcId/items`（可能返回 `UNIT_NOT_IN_SAMPLE`）<br>`POST /api/oqc/:oqcId/complete` | `apps/web/src/routes/_authenticated/mes/oqc/index.tsx` + `apps/web/src/routes/_authenticated/mes/-components/oqc-record-dialog.tsx` + `packages/shared/src/error-codes.ts` | UX/P1：录入时看不到“本次抽样 SN 列表”，导致易输错；且 `UNIT_NOT_IN_SAMPLE` 未做友好文案，排障成本高 | 前端/后端：在 OQC 详情展示样本 SN 列表（只读）；补齐错误码中文映射（shared error-codes 或后端返回中文 message） |
| OQC FAIL 后 MRB 决策（异常路径：FAI 豁免条件） | Run=ON_HOLD 且 OQC=FAIL；`quality:disposition` | Run 详情点击“MRB 决策”→选择 RELEASE/REWORK/SCRAP，必要时填写返修类型/FAI 豁免原因 | 表单校验明确；提交后状态更新 | Run→COMPLETED/CLOSED_REWORK/SCRAPPED | `POST /api/runs/:runNo/mrb-decision` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` | - | - |
| 配置 OQC 抽检规则（异常：产线选择被错误 gate） | `quality:oqc`；产线列表后端允许 `RUN_READ` 或 `LINE_CONFIG` 等任一权限 | `/mes/oqc/rules` 新建/编辑规则；尝试选择产线 | 当前产线选择 disabled（需 `RUN_READ && RUN_CREATE`）导致质量无法按线体配置规则 | - | `GET /api/lines`（后端 requirePermission 为 OR 语义）<br>`POST/PATCH /api/oqc/sampling-rules` | `apps/web/src/routes/_authenticated/mes/oqc/-components/rule-dialog.tsx` + `apps/server/src/modules/mes/line/routes.ts` | 业务逻辑/P1：规则配置的“查看产线列表”不应依赖 `run:create`；会直接限制质量配置能力 | 前端：将 canViewLines gate 改为与后端一致（至少 `RUN_READ`），并在无权限时给出明确解释 |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P0**：Run 收尾触发 `OQC_REQUIRED` 被当成“收尾失败”，缺少明确下一步与跨角色交接入口，导致质量侧无法被有效拉起处理 OQC。  
  - 证据：`apps/server/src/modules/mes/run/service.ts`（返回 `OQC_REQUIRED` + 创建任务）、`apps/web/src/hooks/use-runs.ts`（仍走 showError）、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（未显式引导）
- [ ] **P1**：OQC 抽检规则配置页的“产线选择” gate 使用 `RUN_READ && RUN_CREATE`，与后端 `GET /api/lines` 的 OR 语义不一致，导致质量无法按线体配置抽检规则。  
  - 证据：`apps/web/src/routes/_authenticated/mes/oqc/-components/rule-dialog.tsx`、`apps/server/src/modules/mes/line/routes.ts`
- [ ] **P1**：FAI 记录检验项模板 gating 使用 AND（`DATA_SPEC_READ && DATA_SPEC_CONFIG`），与后端常见 OR 语义不一致，导致“实际可访问 API，但 UI 不开放模板”。  
  - 证据：`apps/web/src/routes/_authenticated/mes/fai.tsx`、`apps/server/src/modules/mes/data-collection-spec/routes.ts`

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P2**：FQC 入口独立且依赖手输 runNo，缺少从 Run 详情的“本 Run 的 FQC 状态/入口”，导致信息分散。  
  - 证据：`apps/web/src/routes/_authenticated/mes/fqc/index.tsx`、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- [ ] **P2**：质量模块的跨页导航不够“带上下文”（Run 详情跳转到 `/mes/fai`、`/mes/oqc` 不带过滤条件）。  
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P1**：OQC/FQC 录入检验项时，看不到“抽样 SN 集合/范围”，错误输入后才被后端拒绝（如 `UNIT_NOT_IN_SAMPLE`），且错误码缺少友好解释。  
  - 证据：`apps/web/src/routes/_authenticated/mes/-components/oqc-record-dialog.tsx`、`domain_docs/mes/tech/api/01_api_overview.md`（错误码）、`packages/shared/src/error-codes.ts`
- [ ] **P1**：FAI 试产数据为空时，只展示“暂无记录”，缺少“下一步去哪做/缺口是什么”的可执行引导。  
  - 证据：`apps/web/src/routes/_authenticated/mes/fai.tsx`、`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- [ ] **P2**：部分质量相关错误码未进入前端友好文案映射（shared error codes），导致 toast 只能显示 fallback + code。  
  - 证据：`packages/shared/src/error-codes.ts`、`apps/web/src/lib/api-error.ts`

### 5.4 UI（一致性/组件规范）

- [ ] **P2**：FAI/FQC/OQC 页面在“列表→详情→操作”的信息层级与 CTA 分布不完全一致（例如签字入口分散），学习成本偏高。  
  - 证据：`apps/web/src/routes/_authenticated/mes/fai.tsx`、`apps/web/src/routes/_authenticated/mes/fqc/index.tsx`、`apps/web/src/routes/_authenticated/mes/oqc/index.tsx`

---

## 6. 建议与下一步（可执行但不实现）

- 把 `OQC_REQUIRED` 从“失败”改成“流程提示”：在 Run 详情明确展示“已创建 OQC，等待质量处理”，并提供一键跳转到该 run 的 OQC（带过滤/直达详情）。  
- 统一前后端 permission gating 语义：前端避免用 AND 组合把可用能力锁死；至少对齐 `GET /api/lines`、`GET /api/data-collection-specs` 的最小可用权限。  
- 提升质量录入效率与可解释性：在 OQC/FQC 记录界面展示本次抽样 SN（只读），并补齐关键错误码的中文映射（或后端返回中文 message）。  

