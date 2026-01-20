# MES 权限审计计划（Permission‑First）

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
