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
