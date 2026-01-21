# MES 权限审计（合并版）

> 说明：本文件由 `permission_audit_prompt.md`、`permission_audit_report.md`、`permission_audit_plan.md` 合并而成，作为后续参考的单一入口。
> 原文件保留以便对照。

---

## 1. 当前权限点代码实现（摘要）

- 权限点定义：统一在 packages/db/src/permissions/permissions.ts（Permission.*），服务端与前端都引用同一套常量。
- 服务端强制：MES 路由在 apps/server/src/modules/mes/*/routes.ts 用 requirePermission 拦截，保证 API 权限硬约束。
- 前端能力判断：apps/web/src/hooks/use-ability.ts 提供 hasPermission；组件侧用 apps/web/src/components/ability/can.tsx 做 action gating。
- 页面/模块展示策略：核心流程模块用 apps/web/src/components/ability/no-access-card.tsx 占位，非关键功能直接隐藏或禁用按钮/入口。
- 数据请求 gating：相关 hooks（如 apps/web/src/hooks/use-*.ts）都支持 enabled，页面根据权限传入，避免无权限时发起请求。
- 具体页面校验与记录：user_docs/demo/permission_audit_plan.md 逐页记录模块‑权限‑展示策略‑API 对照，是人工验收的清单来源。

---

## 2. 审计报告

> 时间: 2026-01-20
> 范围: MES 核心页面与接口（work orders / runs / run detail / execution / readiness / FAI / OQC / trace / loading / routes）

---

## 1. 角色权限矩阵（摘要）

| 角色 | 权限列表（摘要） | 数据范围 |
| --- | --- | --- |
| admin | SYSTEM_USER_MANAGE, SYSTEM_ROLE_MANAGE, SYSTEM_CONFIG, SYSTEM_INTEGRATION, DATA_SPEC_CONFIG, WO_READ, RUN_READ, ROUTE_READ, TRACE_READ, EXEC_READ, READINESS_VIEW, LOADING_VIEW | ALL |
| planner | WO_READ, WO_RECEIVE, WO_RELEASE, WO_UPDATE, WO_CLOSE, RUN_READ, RUN_CREATE, ROUTE_READ, TRACE_READ, READINESS_VIEW | ALL |
| engineer | SYSTEM_INTEGRATION, ROUTE_READ, ROUTE_CONFIGURE, ROUTE_COMPILE, ROUTE_CREATE, DATA_SPEC_CONFIG, OPERATION_CONFIG, WO_READ, RUN_READ, TRACE_READ, READINESS_CONFIG, LOADING_CONFIG | ALL |
| quality | QUALITY_FAI, QUALITY_OQC, QUALITY_DISPOSITION, TRACE_READ, TRACE_EXPORT, WO_READ, RUN_READ, EXEC_READ, READINESS_VIEW, READINESS_CHECK, READINESS_OVERRIDE | ALL |
| leader | RUN_READ, RUN_CREATE, RUN_AUTHORIZE, RUN_REVOKE, RUN_CLOSE, EXEC_READ, EXEC_TRACK_IN, EXEC_TRACK_OUT, EXEC_DATA_COLLECT, WO_READ, WO_CLOSE, TRACE_READ, ROUTE_READ, READINESS_VIEW, READINESS_CHECK, READINESS_OVERRIDE, LOADING_VIEW, LOADING_VERIFY | ASSIGNED_LINES |
| operator | EXEC_TRACK_IN, EXEC_TRACK_OUT, TRACE_READ, READINESS_VIEW, LOADING_VIEW, LOADING_VERIFY | ASSIGNED_STATIONS |

> 权限完整定义见 `packages/db/src/permissions/permissions.ts`。

---

## 2. API-权限对照表（核心接口）

| 模块 | API Path | Method | 权限 |
| --- | --- | --- | --- |
| work-orders | `/api/work-orders` | GET | `wo:read` |
| work-orders | `/api/work-orders/:woNo/release` | POST | `wo:release` |
| work-orders | `/api/work-orders/:woNo/runs` | POST | `run:create` |
| work-orders | `/api/work-orders/:woNo/pick-status` | PATCH | `wo:update` |
| work-orders | `/api/work-orders/:woNo/close` | POST | `wo:close` |
| runs | `/api/runs` | GET | `run:read` |
| runs | `/api/runs/:runNo` | GET | `run:read` |
| runs | `/api/runs/:runNo/units` | GET | `run:read` |
| runs | `/api/runs/:runNo/authorize` | POST | `run:authorize` / `run:revoke` |
| runs | `/api/runs/:runNo/close` | POST | `run:close` |
| runs | `/api/runs/:runNo/generate-units` | POST | `run:authorize` |
| runs | `/api/runs/:runNo/units` | DELETE | `run:authorize` |
| readiness | `/api/runs/:runNo/readiness/latest` | GET | `readiness:view` |
| readiness | `/api/runs/:runNo/readiness/precheck` | POST | `readiness:check` |
| readiness | `/api/runs/:runNo/readiness/check` | POST | `readiness:check` |
| readiness | `/api/runs/:runNo/readiness/items/:itemId/waive` | POST | `readiness:override` |
| readiness | `/api/readiness/exceptions` | GET | `readiness:view` |
| fai | `/api/fai` / `/api/fai/:faiId` / `/api/fai/run/:runNo` | GET | `quality:fai` |
| fai | `/api/fai/run/:runNo/gate` | GET | `quality:fai` |
| fai | `/api/fai/run/:runNo` | POST | `quality:fai` |
| fai | `/api/fai/:faiId/start` | POST | `quality:fai` |
| oqc | `/api/oqc` / `/api/oqc/:oqcId` / `/api/oqc/run/:runNo` | GET | `quality:oqc` |
| oqc | `/api/oqc/:oqcId/start` | POST | `quality:oqc` |
| oqc | `/api/oqc/:oqcId/complete` | POST | `quality:oqc` |
| mrb | `/api/runs/:runNo/mrb-decision` | POST | `quality:disposition` |
| execution | `/api/stations/resolve-unit/:sn` | GET | `exec:track_in` + `exec:track_out` |
| execution | `/api/stations/:stationCode/unit/:sn/data-specs` | GET | `exec:track_out` |
| execution | `/api/stations/:stationCode/track-in` | POST | `exec:track_in` |
| execution | `/api/stations/:stationCode/track-out` | POST | `exec:track_out` |
| trace | `/api/trace/units/:sn` | GET | `trace:read` |

---

## 3. 页面-权限映射（重点页面）

### `/mes/work-orders`
- **页面加载 API**: `GET /api/work-orders` (`wo:read`)
- **主要操作**:
  - 发布工单: `wo:release`
  - 创建批次: `run:create`
  - 更新拣货状态: `wo:update`
  - 关闭工单: `wo:close`

### `/mes/runs`
- **页面加载 API**: `GET /api/runs` (`run:read`)
- **主要操作**:
  - 创建批次: `run:create`
  - 批量授权/撤销: `run:authorize`

### `/mes/runs/:runNo`
- **页面加载 API**:
  - `GET /api/runs/:runNo` (`run:read`)
  - `GET /api/runs/:runNo/units` (`run:read`)
  - `GET /api/runs/:runNo/readiness/latest` (`readiness:view`)
  - `GET /api/fai/run/:runNo` + `/gate` (`quality:fai`)
  - `GET /api/oqc/run/:runNo` (`quality:oqc`)
- **主要操作**:
  - 授权/撤销: `run:authorize`
  - 收尾: `run:close`
  - 生成单件: `run:authorize`
  - 执行预检/正式检查: `readiness:check`
  - 豁免检查项: `readiness:override`
  - 创建/开始 FAI: `quality:fai`
  - MRB 决策: `quality:disposition`

### `/mes/execution`
- **页面加载/操作 API**:
  - `resolve-unit`: `exec:track_in` + `exec:track_out`
  - `track-in`: `exec:track_in`
  - `track-out`: `exec:track_out`

### `/mes/fai`
- **页面加载/操作 API**: `quality:fai`

### `/mes/oqc`
- **页面加载/操作 API**: `quality:oqc`（MRB: `quality:disposition`）

### `/mes/trace`
- **页面加载 API**: `trace:read`

### `/mes/loading`
- **页面加载/操作 API**: `loading:view` / `loading:verify` / `loading:config`

### `/mes/routes`
- **页面加载/操作 API**: `route:read` / `route:configure` / `route:compile` / `route:create`

---

## 4. 角色 × 页面可访问性矩阵（核心页面）

| 页面 | admin | planner | engineer | quality | leader | operator |
| --- | --- | --- | --- | --- | --- | --- |
| /mes/work-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs/:runNo | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ |
| /mes/execution | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| /mes/fai | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/oqc | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/trace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /mes/loading | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| /mes/routes | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

图例：✅ 完全可用；⚠️ 部分功能可用；❌ 无权限访问。

---

## 5. 问题汇总（本次发现）

| 问题 | 位置 | 影响 | 修复 |
| --- | --- | --- | --- |
| 运行详情页无权限仍请求 readiness/FAI/OQC | `/mes/runs/:runNo` | 403 + 无提示 | 已加权限 gating + 查询 enabled 控制 |
| readiness 豁免使用了错误权限 | `/mes/runs/:runNo` | 无权限用户可见按钮 | 改为 `readiness:override` gating |
| 403 错误提示不明确 + 自动重试 | 全局 | 用户看到“检查网络” | `getApiErrorMessage` + `queryClient` 全局修复 |
| planner 缺少 readiness:view | 角色配置 | 无法查看就绪结果 | 已在预设角色中补充 |

---

## 6. 修复方案（已落地）

1. **角色权限**：为 `planner` 增加 `readiness:view`。
2. **页面权限控制**：
   - `/mes/runs/:runNo`：按 `readiness:view / readiness:override / quality:fai / quality:oqc` 做 UI gating + 禁用无权限查询。
3. **全局错误处理**：
   - 403 显示“权限不足（缺少权限: ...）”
   - React Query 对 401/403 不再重试

---

## 7. 待扩展（后续补齐）

- 其余 MES 页面（data-collection-specs / readiness-config / integration / materials / boms 等）可继续补充页面-权限映射与矩阵细化。

---

## 3. 审计计划（Permission‑First）

> 目标：基于权限点而非角色配置，完成全量页面/模块的权限映射与 UI 展示策略（隐藏/无权限提示/引导配置），保证流程连续性与用户可理解性。

---

## 0. 基本原则

1. **权限优先，不依赖默认角色**：角色仅是权限集合的默认模板；所有页面展示与操作都以权限点为准。
2. **模块级决策**：同一页面不同模块可采用不同策略（隐藏 / 无权限提示 / 配置引导）。
3. **流程连续性优先**：与流程关键步骤相关的模块，缺权限时要保留“能理解流程为何阻断”的信息。
4. **查询不越权**：无 view 权限的模块不得发起对应查询（避免 403+重试）。
5. **反馈明确**：401/403 必须明确为权限问题，并且不重试。

---

## 1. 输入与参考

- E2E 流程：`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- SMT 流程：`domain_docs/mes/spec/process/03_smt_flows.md`
- DIP 流程：`domain_docs/mes/spec/process/04_dip_flows.md`

---

## 2. 能力地图（Flow → Capability → Permission → API）

### 2.1 能力拆分（来自流程图）

通用主干能力：
- 工单接收/发布/收尾
- 批次创建/查看/授权/收尾
- 就绪检查（view / check / override）
- 上料防错（view / verify / config）
- FAI（view / create / start / record / complete）
- 执行与数据采集（track-in / track-out / data-specs）
- 不良与处置（defect / MRB decision）
- OQC（view / start / record / complete）
- 追溯查询
- 路由/工艺配置与编译

SMT 重点：
- 就绪检查项包含 STENCIL / SOLDER_PASTE / EQUIPMENT / MATERIAL / ROUTE / LOADING
- 上料流程（加载站位表、扫码验证、异常处理）

DIP 重点：
- 产线准备阶段（PCB 接收/物料/设备/夹具）
- IPQC‑style 检查节点（未实现也需纳入模块级规划）
- 返修闭环（返修 Run / MRB 决策）

### 2.2 能力表模板

| Flow Step | UI 模块 | 视图权限 | 操作权限 | 相关 API | 备注 |
| --- | --- | --- | --- | --- | --- |
| 就绪检查 | 准备状态卡片 | readiness:view | readiness:check / readiness:override | /runs/:runNo/readiness/* | 关键步骤，需保留解释 |

### 2.3 能力映射（核心流程）

| Flow Step | UI 模块 | 视图权限 | 操作权限 | 相关 API | 备注 |
| --- | --- | --- | --- | --- | --- |
| ERP/主数据同步 | 集成状态/同步面板 | system:integration | system:integration | /integration/status, /integration/erp/*/sync, /integration/tpm/*/sync | 配置与运维模块 |
| 工单接收（ERP） | 接收外部工单 | - | system:integration | /integration/work-orders | 外部接入动作 |
| 工单列表 | 工单列表/详情卡 | wo:read | - | /work-orders | 核心上下文 |
| 工单发布/派工 | 发布工单弹窗 | wo:read | wo:release | /work-orders/:woNo/release | 可执行操作 |
| 工单收尾 | 工单收尾操作 | wo:read | wo:close | /work-orders/:woNo/close | 可执行操作 |
| 批次创建 | 创建批次弹窗 | wo:read | run:create | /work-orders/:woNo/runs | 可执行操作 |
| 批次列表/详情 | 批次列表/详情卡 | run:read | - | /runs, /runs/:runNo, /runs/:runNo/units | 核心上下文 |
| 批次授权/撤销 | 授权/撤销按钮 | run:read | run:authorize / run:revoke | /runs/:runNo/authorize | 可执行操作 |
| 批次收尾 | 收尾确认 | run:read | run:close | /runs/:runNo/close | 可执行操作 |
| 生成单件 | 生成单件操作 | run:read | run:authorize | /runs/:runNo/generate-units, /runs/:runNo/units (DELETE) | 可执行操作 |
| 就绪检查状态 | 准备状态卡片 | readiness:view | - | /runs/:runNo/readiness/latest, /runs/:runNo/readiness/history, /readiness/exceptions | 核心上下文 |
| 就绪检查执行 | 预检/正式检查 | readiness:view | readiness:check | /runs/:runNo/readiness/precheck, /runs/:runNo/readiness/check | 关键步骤 |
| 就绪豁免 | 豁免检查项 | readiness:view | readiness:override | /runs/:runNo/readiness/items/:itemId/waive | 高风险操作 |
| 就绪检查配置 | Readiness 配置 | readiness:view | readiness:config | /lines/:lineId/readiness-config (GET/PUT) | 配置与运维模块 |
| 上料记录/期望 | 上料记录/期望表 | loading:view | - | /runs/:runNo/loading, /runs/:runNo/loading/expectations | 核心上下文 |
| 上料验证/替换 | 扫码验证/替换 | loading:view | loading:verify | /loading/verify, /loading/replace, /runs/:runNo/loading/load-table | 可执行操作 |
| 上料配置 | 站位/映射/解锁 | loading:view | loading:config | /lines/:lineId/feeder-slots (POST/PUT/DELETE), /feeder-slots/:slotId/unlock, /slot-mappings (POST/PUT/DELETE) | 配置与运维模块 |
| FAI 状态/列表 | FAI 列表/状态卡 | quality:fai | - | /fai, /fai/:faiId, /fai/run/:runNo, /fai/run/:runNo/gate | 核心上下文 |
| FAI 执行 | 创建/开始/记录/完成 | quality:fai | quality:fai | /fai/run/:runNo (POST), /fai/:faiId/start, /fai/:faiId/items, /fai/:faiId/complete | 关键步骤 |
| 工位/队列视图 | 工位选择/队列列表 | exec:read（或 exec:track_in / exec:track_out） | - | /stations, /stations/:stationCode/queue | 执行上下文 |
| 执行进站/出站 | 执行操作面板 | exec:track_in / exec:track_out | exec:track_in / exec:track_out | /stations/resolve-unit/:sn, /stations/:stationCode/track-in, /stations/:stationCode/track-out | 关键步骤 |
| 数据采集规格 | 采集项列表/配置 | data_spec:read + data_spec:config | data_spec:config | /data-collection-specs, /data-collection-specs/:specId | 配置与运维模块 |
| 不良与处置 | 不良列表/处置 | quality:disposition | quality:disposition | /defects, /defects/:defectId, /defects/:defectId/disposition, /defects/:defectId/release | 敏感信息 |
| 返修任务 | 返修任务列表/完成 | quality:disposition | quality:disposition | /rework-tasks, /rework-tasks/:taskId/complete | 敏感信息 |
| OQC 状态/列表 | OQC 列表/状态卡 | quality:oqc | - | /oqc, /oqc/:oqcId, /oqc/run/:runNo, /oqc/run/:runNo/gate | 核心上下文 |
| OQC 执行 | 开始/记录/完成 | quality:oqc | quality:oqc | /oqc/:oqcId/start, /oqc/:oqcId/items, /oqc/:oqcId/complete, /oqc/run/:runNo (POST) | 关键步骤 |
| MRB 决策 | MRB 处置 | quality:disposition | quality:disposition | /runs/:runNo/mrb-decision | 敏感信息 |
| 追溯查询 | 追溯查询 | trace:read | - | /trace/units/:sn | 核心上下文 |
| 路由查看 | 路由列表/详情/版本 | route:read | - | /routes, /routes/:routingCode, /routes/:routingCode/versions, /routes/:routingCode/versions/:versionNo | 配置与运维模块 |
| 路由执行语义 | 执行语义配置 | route:read | route:configure | /routes/:routingCode/execution-config (GET/POST/PATCH), /routes/:routingCode (PATCH) | 配置与运维模块 |
| 路由编译 | 编译可执行版本 | route:read | route:compile | /routes/:routingCode/compile | 配置与运维模块 |
| DIP IPQC 节点 | 段首件/测试检查 | - | - | 未实现 | 需纳入模块规划 |

---

## 3. 模块展示策略（Decision Matrix）

### 3.1 模块分类

- **核心上下文模块**：构成流程连续性的必要信息（如 Run 状态、就绪状态、FAI/OQC 状态）。
- **可执行操作模块**：允许推进流程的关键操作（如授权、执行预检、开始 FAI）。
- **配置与运维模块**：面向配置/管理（如路由配置、上料映射、集成同步）。
- **敏感信息模块**：缺陷、处置、审计等可能受限的数据。

### 3.2 决策矩阵

| 模块类型 | 缺少 view 权限 | 缺少 action 权限 | 是否给配置提示 |
| --- | --- | --- | --- |
| 核心上下文 | 显示“无权限查看”占位 | 显示禁用或隐藏（按是否为该流程的执行者） | 若用户具备配置权限，可提示“配置权限” |
| 可执行操作 | 不展示（若视图已无权限） | 显示禁用按钮 + 原因或隐藏 | 同上 |
| 配置与运维 | 默认隐藏 | 默认隐藏 | 仅对具备配置权限的用户显示 CTA |
| 敏感信息 | 直接隐藏 | 直接隐藏 | 不提示配置 |

### 3.3 “配置权限”提示规则

- 只有当用户具备配置权限（如 `system:role_manage` / 对应 domain 的 config 权限）时，显示“去配置权限”。
- 否则展示“联系管理员”。

### 3.4 模块决策流程（逐块判断）

1. **是否属于流程主干关键节点**（就绪、上料、FAI、授权、执行、OQC/MRB、收尾）？
   - 是：优先保持流程可解释性 → 缺 view 显示“无权限查看”占位。
   - 否：进入下一步。
1. **是否属于“非该流程参与者必看”的可选模块**（与当前流程无直接依赖）？
   - 是：倾向隐藏（减少噪音、保持默认体验完整）。
2. **是否敏感数据或高风险操作**（缺陷明细、处置、审计等）？
   - 是：缺 view 直接隐藏；缺 action 隐藏或禁用。
3. **是否属于配置/运维模块**（路由配置、集成同步、站位映射）？
   - 是：默认隐藏；仅当用户具备配置权限时显示“去配置权限/去配置”CTA。
4. **是否会导致流程断链**（用户能看到上一步，但看不到下一步状态/原因）？
   - 是：显示“无权限查看”占位 + 简短原因提示。
5. **动作权限缺失但视图存在**：
   - 若该动作是当前流程的“下一步”，显示禁用按钮 + 原因；
   - 若不是该用户职责（例如仅查看者），可直接隐藏。

### 3.5 占位与提示文案建议

- 无权限查看（核心上下文）：`无权限查看该环节信息` + `请联系管理员`。
- 配置权限 CTA：`当前未配置权限` + `去配置权限`（仅对具备配置权限的用户）。
- 动作禁用原因：`缺少权限：xxx` 或 `当前角色无权执行该操作`。

---

## 4. 查询与错误处理规范

- **Query gating**：无 view 权限 → `enabled: false`，不发请求。
- **403/401**：统一显示“权限不足/登录失效”提示，并禁用重试。
- **Action gating**：无 action 权限 → UI 禁用/隐藏并显示原因。

---

## 5. 页面级审计步骤（Checklist）

对每个页面执行如下步骤：

1. **模块拆分**：列出页面上的所有功能块（卡片/表格/按钮/弹窗）。
2. **权限映射**：为每个模块绑定 view + action 权限。
3. **API 对照**：列出模块调用的 API，并确认服务端权限要求一致。
4. **展示策略**：选择隐藏/无权限/配置引导，并写明原因（基于流程连续性）。
5. **Query gating**：检查每个 query 是否基于 view 权限启用。
6. **Action gating**：检查每个操作按钮/弹窗是否基于 action 权限。
7. **错误处理**：确认 401/403 呈现为权限提示。

### 5.1 输出记录要求

- 每个页面必须输出：模块清单 + 权限映射 + 展示策略 + 关键 API 对照。
- 每个模块必须记录“为何选择隐藏/占位/CTA”的理由（基于流程连续性）。

输出格式（建议每页一段）：

```
### 页面：/mes/runs/:runNo
模块：准备状态卡片
- View 权限：readiness:view
- Action 权限：readiness:check / readiness:override
- 相关 API：/runs/:runNo/readiness/*
- 展示策略：缺 view → 显示“无权限查看”；缺 action → 禁用按钮
- Query gating：useReadinessLatest enabled 需依赖 readiness:view
- 状态：待检查/已修复
```

---

## 6. 页面清单（Flow‑Ordered）

核心流程：
- `/mes/work-orders`
- `/mes/runs`
- `/mes/runs/:runNo`
- `/mes/readiness-config`
- `/mes/readiness-exceptions`
- `/mes/loading`
- `/mes/loading/slot-config`
- `/mes/execution`
- `/mes/fai`
- `/mes/oqc`
- `/mes/oqc/rules`
- `/mes/defects`
- `/mes/rework-tasks`
- `/mes/trace`

配置与工艺：
- `/mes/routes`
- `/mes/routes/:routingCode`
- `/mes/route-versions`
- `/mes/data-collection-specs`

主数据与集成：
- `/mes/materials`
- `/mes/boms`
- `/mes/work-centers`
- `/mes/integration/status`
- `/mes/integration/manual-entry`

辅助记录：
- `/mes/bake-records`
- `/mes/solder-paste-usage`
- `/mes/cold-storage-temperatures`

---

## 7. 任务切片（执行顺序）

1. **模板页（Run Detail）**：先做 `/mes/runs/:runNo`，输出完整模块示例。
2. **主干流程页**：work-orders → runs → execution → loading → fai/oqc。
3. **配置与运维页**：routes、data-specs、integration。
4. **辅助/记录页**：bake, solder‑paste, cold‑storage。

---

## 8. 交付物

- `user_docs/demo/permission_audit_plan.md`（本计划）
- 模块级能力地图（追加到本文件）
- 页面级审计表（逐页追加）
- 修复任务列表（按切片）

---

## 9. 页面审计记录（逐页追加）

### 页面：/mes/runs/:runNo（批次详情）

**页面级查询**：
- run 详情/units：`run:read` → `/runs/:runNo`, `/runs/:runNo/units`
- readiness 最新：`readiness:view` → `/runs/:runNo/readiness/latest`
- FAI gate/记录：`quality:fai` → `/fai/run/:runNo`, `/fai/run/:runNo/gate`
- OQC 记录：`quality:oqc` → `/oqc/run/:runNo`

**模块审计**：

1) 批次头部 + 操作区  
- View 权限：`run:read`  
- Action 权限：`run:authorize` / `run:revoke` / `run:close` / `exec:track_in`  
- 展示策略：Action 缺失 → 隐藏按钮（当前为 `<Can>`）  
- 状态：✅ 已 gating  

2) 流程进度卡（就绪/FAI/授权/执行/收尾）  
- View 权限：`readiness:view`, `quality:fai`, `run:read`  
- 展示策略：缺 view → 显示“无权限”标签（已在 readiness/fai stage 处理）  
- 状态：✅ 文案一致性已确认  

3) 批次统计卡（含“生成单件”）  
- View 权限：`run:read`  
- Action 权限：`run:authorize`  
- 展示策略：缺 action → 隐藏或禁用按钮  
- 状态：✅ 已按 `run:authorize` gating  

4) 准备状态卡（就绪检查）  
- View 权限：`readiness:view`  
- Action 权限：`readiness:check` / `readiness:override`  
- 展示策略：缺 view → 显示“无权限查看”；缺 action → 禁用/隐藏按钮  
- 状态：✅ 已 gating  
- 补充：`前往上料` 已按 `loading:view` gating  

5) FAI 卡片  
- View 权限：`quality:fai`  
- Action 权限：`quality:fai`  
- 展示策略：缺 view → 建议保留“无权限查看”占位（保持流程连续性）  
- 状态：✅ 已保留无权限占位  

6) OQC 卡片  
- View 权限：`quality:oqc`  
- Action 权限：`quality:oqc` / `quality:disposition`（MRB）  
- 展示策略：缺 view → 建议占位；缺 action → 隐藏按钮  
- 状态：✅ 已保留无权限占位；MRB 按钮已有 gating  

7) 路由版本卡片  
- View 权限：`run:read`（数据来自 run 详情）  
- 额外权限：`route:read`（进入路由详情页）  
- 展示策略：无 `route:read` 时链接降级为纯文本  
- 状态：✅ 无权限时降级为文本  

8) 路由进度 / Unit 列表  
- View 权限：`run:read`  
- 展示策略：正常展示  
- 状态：✅  

**Dialog 审计**：  
- 豁免检查项：`readiness:override` ✅  
- 创建 FAI：`quality:fai` ✅  
- MRB 决策：`quality:disposition` ✅  
- 批次收尾：`run:close` ✅  
- 生成单件：`run:authorize` ✅

### 页面：/mes/work-orders（工单管理）

**页面级查询**：
- 工单列表：`wo:read` → `/work-orders`
- 路由筛选：`route:read` → `/routes`（用于路由筛选选项）

**动作 API**：
- 接收外部工单：`wo:receive` → `/integration/work-orders`
- 发布工单：`wo:release` → `/work-orders/:woNo/release`
- 创建批次：`run:create` → `/work-orders/:woNo/runs`
- 更新拣货状态：`wo:update` → `/work-orders/:woNo/pick-status`
- 工单收尾：`wo:close` → `/work-orders/:woNo/close`

**模块审计**：

1) 工单列表/卡片  
- View 权限：`wo:read`  
- 展示策略：核心上下文，缺 view → 无权限占位  
- 状态：✅  

2) 过滤条件（路由工艺筛选）  
- View 权限：`route:read`  
- 展示策略：可选模块，缺 view → 隐藏该筛选  
- 状态：✅ 按 `route:read` gating 并隐藏筛选  

3) 接收工单按钮 + 对话框  
- Action 权限：`wo:receive`  
- 展示策略：配置/运维动作，缺权限 → 隐藏  
- 状态：✅ 前后端权限对齐  

4) 发布/创建批次/更新拣货/收尾动作  
- Action 权限：`wo:release` / `run:create` / `wo:update` / `wo:close`  
- 展示策略：缺 action → 隐藏  
- 状态：✅ 已在卡片/表格中 gating  

### 页面：/mes/runs（批次列表）

**页面级查询**：
- 批次列表：`run:read` → `/runs`
- 线体筛选：`run:read` + `run:create` → `/lines`（LineSelect 使用）

**动作 API**：
- 授权/撤销：`run:authorize` / `run:revoke` → `/runs/:runNo/authorize`

**模块审计**：

1) 批次列表/卡片  
- View 权限：`run:read`  
- 展示策略：核心上下文  
- 状态：✅ 页面级无权限占位 + query enabled  

2) 创建批次入口（跳转工单页）  
- Action 权限：`run:create`  
- 展示策略：缺 action → 隐藏  
- 状态：✅ `<Can>` gating  

3) 线体筛选（LineSelect）  
- View 权限：`run:read` + `run:create`  
- 展示策略：可选模块，缺权限 → 隐藏  
- 状态：✅ 按权限 gating + 禁用查询  

4) 批量授权  
- Action 权限：`run:authorize`  
- 展示策略：缺权限 → 隐藏按钮 + 选择列  
- 状态：✅ 隐藏批量按钮与选择列  

5) 行内授权/撤销  
- Action 权限：`run:authorize` / `run:revoke`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ 已 gating  

### 页面：/mes/readiness-config（准备检查配置）

**页面级查询**：
- 产线列表：`run:read` + `run:create` → `/lines`
- Readiness 配置：`readiness:view` → `/lines/:lineId/readiness-config`

**动作 API**：
- 更新准备检查配置：`readiness:config` → `/lines/:lineId/readiness-config`（PUT）
- 更新产线工艺类型：`readiness:config` → `/lines/:lineId`（PATCH）

**模块审计**：

1) 产线选择器  
- View 权限：`run:read` + `run:create`  
- 展示策略：可选模块，缺权限 → 隐藏筛选（避免 `/lines` 403）  
- 状态：✅ 按权限 gating，缺权限不请求 `/lines`  

2) 工艺类型选择 + 保存  
- View 权限：`readiness:view`（页面上下文）  
- Action 权限：`readiness:config`  
- 展示策略：缺 view → 页面级无权限占位；缺 action → 隐藏保存按钮  
- 状态：✅ 页面 view gating + action 按钮 `<Can>`  

3) 检查项列表（Checkbox 网格）  
- View 权限：`readiness:view`  
- Action 权限：`readiness:config`  
- 展示策略：缺 view → 无权限占位；缺 action → 只读（禁用勾选 + 隐藏保存）  
- 状态：✅ view gating + 无 action 时禁用交互  

### 页面：/mes/readiness-exceptions（准备异常看板）

**页面级查询**：
- 异常列表：`readiness:view` → `/readiness/exceptions`
- 产线列表（筛选）：`run:read` + `run:create` → `/lines`

**模块审计**：

1) 筛选条件  
- 产线筛选：`run:read` + `run:create`  
- 其他筛选（状态/日期）：无权限要求  
- 展示策略：缺产线权限 → 隐藏产线筛选  
- 状态：✅ 按权限 gating，缺权限不请求 `/lines`  

2) 异常列表表格  
- View 权限：`readiness:view`  
- 展示策略：缺 view → 页面级“无权限查看”占位（监控类页面）  
- Query gating：`useReadinessExceptions` 需依赖 `readiness:view`  
- 状态：✅ `useReadinessExceptions` 按 `readiness:view` gating  

3) 批次号跳转  
- Action 权限：`run:read`（进入批次详情）  
- 展示策略：缺 `run:read` 时降级为纯文本  
- 状态：✅ 缺 `run:read` 时降级为文本  

### 页面：/mes/loading（上料防错）

**页面级查询**：
- 批次列表：`run:read` → `/runs`（PREP 列表）
- 批次详情：`run:read` → `/runs/:runNo`
- 上料期望/记录：`loading:view` → `/runs/:runNo/loading/expectations`, `/runs/:runNo/loading`

**动作 API**：
- 加载站位表：`loading:verify` → `/runs/:runNo/loading/load-table`
- 扫码验证/替换：`loading:verify` → `/loading/verify`, `/loading/replace`（见 ScanPanel）
- 站位解锁：`loading:config` → `/feeder-slots/:slotId/unlock`（见 SlotList）

**模块审计**：

1) 批次选择器  
- View 权限：`run:read`  
- 展示策略：缺权限 → 页面级无权限占位  
- 状态：✅ 按 `run:read` gating（列表/详情）  

2) 初始化站位表卡片  
- View 权限：`loading:view`（上下文）  
- Action 权限：`loading:verify`  
- 展示策略：缺 view → 无权限占位；缺 action → 禁用按钮  
- 状态：✅ 缺权限显示无权限占位/禁用  

3) 扫码验证面板 + 站位列表  
- View 权限：`loading:view`  
 - Action 权限：`loading:verify`  
 - 展示策略：缺 view → 无权限占位（保持流程连续性）；缺 action → 禁用提交按钮  
 - 状态：✅ 按 `loading:view` / `loading:verify` gating  

4) 上料历史记录  
- View 权限：`loading:view`  
- 展示策略：缺 view → 隐藏  
- 状态：✅ `useLoadingRecords` 按 `loading:view` gating  

5) 站位解锁按钮  
- Action 权限：`loading:config`  
- 展示策略：缺权限 → 隐藏解锁入口  
- 状态：✅ 按 `loading:config` 隐藏入口  

### 页面：/mes/loading/slot-config（站位表配置）

**页面级查询**：
- 产线列表：`run:read` + `run:create` → `/lines`
- 站位列表：`loading:view` → `/lines/:lineId/feeder-slots`
- 物料映射列表：`loading:view` → `/slot-mappings`

**动作 API**：
- 站位增删改：`loading:config` → `/lines/:lineId/feeder-slots`（POST/PUT/DELETE）
- 物料映射增删改：`loading:config` → `/slot-mappings`（POST/PUT/DELETE）
- 站位解锁：`loading:config` → `/feeder-slots/:slotId/unlock`（如页面支持）

**模块审计**：

1) 产线选择器  
- View 权限：`run:read` + `run:create`  
- 展示策略：可选模块，缺权限 → 隐藏（避免 `/lines` 403）  
- 状态：✅ 按权限 gating  

2) 站位/映射列表  
- View 权限：`loading:view`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面 view gating + 查询 enabled  

3) 新建/编辑/删除按钮与菜单  
- Action 权限：`loading:config`  
- 展示策略：缺 action → 隐藏  
- 状态：✅ 已 `<Can>` gating  

4) 弹窗（SlotDialog/MappingDialog）  
- Action 权限：`loading:config`  
- 展示策略：缺 action → 不可打开  
- 状态：✅ 入口权限控制即可（弹窗由入口触发）  

5) 路由筛选（MappingDialog 内）  
- View 权限：`route:read`（`useRouteSearch`）  
- 展示策略：缺权限 → 隐藏路由选择或仅保留“所有路由”  
- 状态：✅ `useRouteSearch` 按 `route:read` gating + 禁用选择  

### 页面：/mes/execution（工位执行）

**页面级查询**：
- 工位列表：`exec:read` 或 `exec:track_in` / `exec:track_out` → `/stations`
- 工位队列：`exec:read` 或 `exec:track_in` / `exec:track_out` → `/stations/:stationCode/queue`
- 可执行批次列表：`run:read` → `/runs`（AUTHORIZED/PREP/IN_PROGRESS）
- 批次详情/待进站 Unit：`run:read` → `/runs/:runNo`, `/runs/:runNo/units`
- SN 解析：`exec:track_in`（推测） → `/stations/resolve-unit/:sn`
- 出站采集项：`exec:track_out` → `/stations/:stationCode/data-specs/:sn`

**动作 API**：
- 进站：`exec:track_in` → `/stations/:stationCode/track-in`
- 出站：`exec:track_out` → `/stations/:stationCode/track-out`

**模块审计**：

1) 工位选择器  
- View 权限：`exec:read` 或 `exec:track_in` / `exec:track_out`  
- 展示策略：缺权限 → 页面级无权限占位  
- 状态：✅ 页面级 gating + `/stations` enabled  

2) 待执行批次列表（快捷选择）  
- View 权限：`run:read`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ 缺权限隐藏 + 查询 gated  

3) 当前队列  
- View 权限：`exec:read` 或 `exec:track_in` / `exec:track_out`  
- Action 权限：`exec:track_out`（出站/报不良）  
- 展示策略：缺 view → 无权限占位；缺 action → 禁用按钮  
- 状态：✅ 队列查询 gated + 按钮按权限禁用  

4) 待进站列表  
- View 权限：`run:read`（队列数据）  
- Action 权限：`exec:track_in`（进站）  
- 展示策略：缺 view → 无权限占位；缺 action → 禁用按钮  
- 状态：✅ 视图占位 + 查询 gated  

5) 进站/出站表单  
- View 权限：`run:read`（下拉列表）  
- Action 权限：`exec:track_in` / `exec:track_out`  
- 展示策略：缺 action → 禁用提交  
- 状态：✅ 下拉按权限显示 + `resolve-unit` 按 exec 权限 gating  

6) TrackOut 对话框（含数据采集）  
- View 权限：`exec:track_out`  
- Action 权限：`exec:track_out`  
- 展示策略：缺权限 → 不可打开  
- 状态：✅ 对话框查询按权限 gating  

### 页面：/mes/fai（首件检验）

**页面级查询**：
- FAI 列表/详情：`quality:fai` → `/fai`, `/fai/:faiId`
- 批次列表/详情：`run:read` → `/runs`, `/runs/:runNo`
- 采集项模板：`data_spec:read` + `data_spec:config` → `/data-collection-specs`

**动作 API**：
- 开始/记录/完成 FAI：`quality:fai` → `/fai/:faiId/start`, `/fai/:faiId/items`, `/fai/:faiId/complete`
- 生成单件：`run:authorize` → `/runs/:runNo/generate-units`

**模块审计**：

1) FAI 列表 + 详情  
- View 权限：`quality:fai`  
- 展示策略：缺 view → 页面级无权限占位  
- 状态：✅ 页面级 gating + list/detail enabled  

2) 批次筛选（Run Combobox）  
- View 权限：`run:read`  
- 展示策略：缺权限 → 隐藏筛选  
- 状态：✅ 缺权限隐藏 + run list gated  

3) 开始/记录/完成按钮  
- Action 权限：`quality:fai`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ `<Can>` gating  

4) 采集项模板（记录弹窗）  
- View 权限：`data_spec:read` + `data_spec:config`  
- 展示策略：缺权限 → 隐藏模板选择或提示无权限  
- 状态：✅ 模板选择按权限 gating + query enabled  

5) 生成单件（FAI 开始时触发）  
- Action 权限：`run:authorize`  
- 展示策略：缺权限 → 不提供生成路径或提示无权限  
- 状态：✅ 生成单件按 `run:authorize` gating  

6) 批次号跳转  
- Action 权限：`run:read`  
- 展示策略：缺权限 → 降级为纯文本  
- 状态：✅ 缺权限降级为文本  

### 页面：/mes/oqc（出货检验）

**页面级查询**：
- OQC 列表/详情：`quality:oqc` → `/oqc`, `/oqc/:oqcId`

**动作 API**：
- 开始/记录/完成 OQC：`quality:oqc` → `/oqc/:oqcId/start`, `/oqc/:oqcId/items`, `/oqc/:oqcId/complete`

**模块审计**：

1) OQC 列表  
- View 权限：`quality:oqc`  
- 展示策略：缺 view → 页面级无权限占位  
- 状态：✅ 页面级 gating + list enabled  

2) 操作按钮（开始/记录/完成/查看）  
- Action 权限：`quality:oqc`  
- 展示策略：缺权限 → 隐藏或只读  
- 状态：✅ 表格/卡片动作按权限 gating  

3) 记录/完成弹窗  
- Action 权限：`quality:oqc`  
- 展示策略：缺权限 → 不可打开  
- 状态：✅ 入口 action gating + detail 查询 gated  

### 页面：/mes/oqc/rules（OQC 抽检规则）

**页面级查询**：
- 规则列表：`quality:oqc` → `/oqc/sampling-rules`

**动作 API**：
- 新建/编辑/停用规则：`quality:oqc` → `/oqc/sampling-rules`（POST/PATCH/DELETE）

**模块审计**：

1) 规则列表  
- View 权限：`quality:oqc`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级 gating + list enabled  

2) 新建/编辑/停用  
- Action 权限：`quality:oqc`  
- 展示策略：缺权限 → 隐藏入口  
- 状态：✅ `<Can>` gating  

3) RuleDialog 内部依赖  
- View 权限：`run:read` + `run:create`（产线列表），`route:read`（路由列表）  
- 展示策略：缺权限 → 隐藏对应筛选或降级为“ALL”  
- 状态：✅ 产线/路由选择按权限 gating  

### 页面：/mes/defects（缺陷管理）

**页面级查询**：
- 缺陷列表/详情：`quality:disposition` → `/defects`, `/defects/:defectId`
- 追溯步骤（返工）：`trace:read` → `/trace/units/:sn`

**动作 API**：
- 处置/释放：`quality:disposition` → `/defects/:defectId/disposition`, `/defects/:defectId/release`

**模块审计**：

1) 缺陷列表 + 详情  
- View 权限：`quality:disposition`  
- 展示策略：敏感模块，缺 view → 直接隐藏/页面级无权限占位  
- 状态：✅ 页面级 gating + list/detail enabled  

2) 处置/释放操作  
- Action 权限：`quality:disposition`  
- 展示策略：缺权限 → 隐藏按钮与对话框入口  
- 状态：✅ 入口按权限 gating  

3) 返工工步查询（追溯）  
- View 权限：`trace:read`  
- 展示策略：缺权限 → 退化为手动输入工步  
- 状态：✅ 已通过 `canTraceRead` gating  

### 页面：/mes/rework-tasks（返工任务）

**页面级查询**：
- 返工任务列表：`quality:disposition` → `/rework-tasks`

**动作 API**：
- 完成返工：`quality:disposition` → `/rework-tasks/:taskId/complete`

**模块审计**：

1) 返工任务列表  
- View 权限：`quality:disposition`  
- 展示策略：敏感模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级 gating + list enabled  

2) 完成返工按钮/对话框  
- Action 权限：`quality:disposition`  
- 展示策略：缺权限 → 隐藏按钮与对话框入口  
- 状态：✅ 入口按权限 gating  

### 页面：/mes/trace（追溯查询）

**页面级查询**：
- 追溯详情：`trace:read` → `/trace/units/:sn`（`mode=run|latest`）

**模块审计**：

1) 查询表单  
- View 权限：`trace:read`  
- 展示策略：缺权限 → 页面级无权限占位  
- 状态：✅ 页面级 gating  

2) 追溯结果（产品/路由/执行/采集/缺陷/物料）  
- View 权限：`trace:read`  
- 展示策略：核心上下文，缺 view → 无权限占位  
- 状态：✅ `useUnitTrace` 按权限 gating  

### 页面：/mes/routes（路由管理）

**页面级查询**：
- 路由列表：`route:read` → `/routes`

**模块审计**：

1) 路由列表/卡片  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + `useRouteList` enabled  

2) 详情入口（卡片/表格）  
- View 权限：`route:read`  
- 展示策略：缺权限 → 隐藏入口  
- 状态：✅ 页面级 gating（无权限不渲染列表）  

### 页面：/mes/routes/:routingCode（路由详情）

**页面级查询**：
- 路由详情：`route:read` → `/routes/:routingCode`
- 执行配置：`route:read` → `/routes/:routingCode/execution-config`
- 站点组：`route:read` / `route:configure` / `wo:release` / `run:create` → `/stations/groups`
- 工位列表：`exec:read` / `exec:track_in` / `exec:track_out` → `/stations`
- 采集项：`data_spec:read` + `data_spec:config` → `/data-collection-specs`

**动作 API**：
- 更新工艺类型：`route:configure` → `/routes/:routingCode`（PATCH）
- 新增/编辑执行配置：`route:configure` → `/routes/:routingCode/execution-config`（POST/PATCH）
- 编译路由：`route:compile` → `/routes/:routingCode/compile`
- 批量配置站点组：`route:configure` → `/routes/:routingCode/execution-config`（POST）

**模块审计**：

1) 路由信息/步骤列表  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级 gating（`useRouteDetail` enabled）  

2) 执行语义配置列表  
- View 权限：`route:read`  
- 展示策略：缺 view → 页面级无权限占位  
- 状态：✅ `useExecutionConfigs` enabled  

3) 编译按钮  
- Action 权限：`route:compile`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ `<Can>` gating  

4) 工艺类型保存 + 新增配置  
- Action 权限：`route:configure`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ `<Can>` gating  

5) 执行配置弹窗提交  
- Action 权限：`route:configure`  
- 展示策略：缺权限 → 禁用保存  
- 状态：✅ 入口按钮受 `<Can>` 控制，提交按钮禁用  

6) 站点组/工位选择器  
- View 权限：`route:read` / `route:configure` / `wo:release` / `run:create`（站点组）  
- View 权限：`exec:read` / `exec:track_in` / `exec:track_out`（工位）  
- 展示策略：缺权限 → 隐藏对应选择器  
- 状态：✅ 查询 enabled 受 route:read 控制  

7) 采集项选择器（DataSpecSelector）  
- View 权限：`data_spec:read` + `data_spec:config`  
- 展示策略：缺权限 → 隐藏/提示无权限  
- 状态：✅ DataSpecSelector 按权限 enabled  

### 页面：/mes/route-versions（路由版本）

**页面级查询**：
- 路由搜索：`route:read` → `/routes`
- 版本列表：`route:read` → `/routes/:routingCode/versions`

**动作 API**：
- 编译路由：`route:compile` → `/routes/:routingCode/compile`

**模块审计**：

1) 路由选择器 + 版本列表  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ `RouteSelect`/`useRouteVersions` 按 route:read gating  

2) 编译按钮  
- Action 权限：`route:compile`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ `<Can>` gating  

### 页面：/mes/data-collection-specs（采集项管理）

**页面级查询**：
- 采集项列表：`data_spec:read` + `data_spec:config` → `/data-collection-specs`
- 工序列表：`operation:read` + `data_spec:config` → `/operations`

**动作 API**：
- 新建/编辑/启停：`data_spec:config` → `/data-collection-specs`（POST/PATCH）

**模块审计**：

1) 列表 + 筛选  
- View 权限：`data_spec:read` + `data_spec:config`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + list enabled  

2) 工序筛选  
- View 权限：`operation:read` + `data_spec:config`  
- 展示策略：缺权限 → 隐藏筛选  
- 状态：✅ `useOperationList` enabled  

3) 新建/编辑/启停  
- Action 权限：`data_spec:config`  
- 展示策略：缺权限 → 隐藏  
- 状态：✅ 表格/卡片动作已 gating  

### 页面：/mes/integration/status（集成状态）

**页面级查询**：
- 集成状态：`system:integration` → `/integration/status`

**模块审计**：

1) 状态列表  
- View 权限：`system:integration`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

### 页面：/mes/integration/manual-entry（耗材状态录入）

**页面级查询**：
- 产线列表：`run:read` + `run:create` → `/lines`

**动作 API**：
- 钢网状态录入：`system:integration` → `/integration/stencil-status`
- 锡膏状态录入：`system:integration` → `/integration/solder-paste-status`
- 产线绑定（钢网/锡膏）：`loading:config` → `/integration/lines/:lineId/*`

**模块审计**：

1) 钢网/锡膏状态录入表单  
- Action 权限：`system:integration`  
- 展示策略：缺权限 → 隐藏提交按钮  
- 状态：✅ 页面级 system:integration gating + `<Can>` 提交控制  

2) 产线绑定（选择产线 + 绑定按钮）  
- View 权限：`run:read` + `run:create`  
- Action 权限：`loading:config`  
- 展示策略：缺 view → 隐藏产线选择；缺 action → 隐藏绑定按钮  
- 状态：✅ 产线列表 query gating + 无权限提示 + `<Can>` 按钮  

### 页面：/mes/materials（物料主数据）

**页面级查询**：
- 物料列表：`route:read` → `/materials`

**模块审计**：

1) 列表 + 筛选  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

### 页面：/mes/boms（BOM）

**页面级查询**：
- BOM 列表：`route:read` → `/boms`

**模块审计**：

1) 列表 + 明细弹窗  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

### 页面：/mes/work-centers（工作中心）

**页面级查询**：
- 工作中心列表：`route:read` → `/work-centers`

**模块审计**：

1) 列表 + 筛选  
- View 权限：`route:read`  
- 展示策略：配置与运维模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

### 页面：/mes/bake-records（烘烤记录）

**页面级查询**：
- 烘烤记录列表：`readiness:view` → `/bake-records`

**动作 API**：
- 新增烘烤记录：`readiness:check` → `/bake-records`（POST）

**模块审计**：

1) 列表 + 筛选  
- View 权限：`readiness:view`  
- 展示策略：辅助记录模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

2) 新增记录  
- Action 权限：`readiness:check`  
- 展示策略：缺权限 → 隐藏入口  
- 状态：✅ `<Can>` gating  

### 页面：/mes/solder-paste-usage（锡膏使用记录）

**页面级查询**：
- 锡膏使用记录列表：`readiness:view` → `/solder-paste-usage-records`

**动作 API**：
- 新增使用记录：`readiness:check` → `/solder-paste-usage-records`（POST）

**模块审计**：

1) 列表 + 筛选  
- View 权限：`readiness:view`  
- 展示策略：辅助记录模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

2) 新增记录  
- Action 权限：`readiness:check`  
- 展示策略：缺权限 → 隐藏入口  
- 状态：✅ `<Can>` gating  

### 页面：/mes/cold-storage-temperatures（冷藏温度记录）

**页面级查询**：
- 冷藏温度记录列表：`readiness:view` → `/cold-storage-temperature-records`

**动作 API**：
- 新增温度记录：`readiness:check` → `/cold-storage-temperature-records`（POST）

**模块审计**：

1) 列表 + 筛选  
- View 权限：`readiness:view`  
- 展示策略：辅助记录模块，缺 view → 页面级无权限占位  
- 状态：✅ 页面级无权限占位 + query enabled  

2) 新增记录  
- Action 权限：`readiness:check`  
- 展示策略：缺权限 → 隐藏入口  
- 状态：✅ `<Can>` gating
