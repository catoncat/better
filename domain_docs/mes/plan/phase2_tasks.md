# Phase 2 Plan (M2 - Execution Control & Quality) — Consolidated

> 状态：**执行中**
> 更新时间：2025-01-02
> 目标：准备检查门禁、FAI、缺陷处置、OQC 抽检、收尾关闭
> 说明：本文件合并 `phase2_detailed_breakdown.md` 与 `phase2_line_readiness_design.md`。

---

## 1. 现状与实现进度（As-Built 快照）

### 1.1 Line Readiness Check（已落地）
- **数据模型**：已新增 `ReadinessCheck` / `ReadinessCheckItem` + enums + `AuditEntityType.READINESS_CHECK`。
- **检查逻辑**：设备 / 物料 / 路由三类检查已实现。
- **API**：预检、正式检查、最新/历史、豁免、异常看板接口已实现。
- **门禁**：Run 授权时调用 `canAuthorize`；若无正式检查记录，会自动触发一次正式检查。
- **触发**：TPM 同步与路由版本变更后会对关联 Run 触发预检；**Run 创建后自动预检尚未实现**。
- **UI**：Run 详情页已有准备检查卡片、执行/豁免操作；异常看板页面已完成；配置页未实现。
- **权限**：`readiness:view/check/override/config` 已加入权限字典。

### 1.2 Phase 2 其它模块（未开始/待规划）
- FAI、缺陷处置、OQC、Closeout 暂未落地。

---

## 2. Line Readiness Check 设计与实现对照

### 2.1 数据模型（已实现）

```prisma
enum ReadinessCheckType { PRECHECK FORMAL }
enum ReadinessCheckStatus { PENDING PASSED FAILED }
enum ReadinessItemType { EQUIPMENT MATERIAL ROUTE }
enum ReadinessItemStatus { PASSED FAILED WAIVED }

model ReadinessCheck {
  id        String @id @default(cuid())
  runId     String
  type      ReadinessCheckType
  status    ReadinessCheckStatus
  checkedAt DateTime @default(now())
  checkedBy String?
  meta      Json?
  run       Run @relation(fields: [runId], references: [id])
  items     ReadinessCheckItem[]
}

model ReadinessCheckItem {
  id          String @id @default(cuid())
  checkId     String
  itemType    ReadinessItemType
  itemKey     String
  status      ReadinessItemStatus
  failReason  String?
  evidenceJson Json?
  waivedAt    DateTime?
  waivedBy    String?
  waiveReason String?
  check       ReadinessCheck @relation(fields: [checkId], references: [id])
}
```

### 2.2 检查逻辑（已实现）
- **设备检查 (EQUIPMENT)**
  - 数据源：`TpmEquipment` + `TpmMaintenanceTask`
  - 规则：设备状态非 `normal` 失败；存在未完成的阻断任务（`PENDING`/`IN_PROGRESS` 且类型为 `REPAIR`/`CRITICAL`/`breakdown`）失败。
- **物料检查 (MATERIAL)**
  - 数据源：`BomItem` + `Material`
  - 规则：BOM 为空失败；子料无主数据失败。
- **路由检查 (ROUTE)**
  - 数据源：`ExecutableRouteVersion`
  - 规则：未绑定路由版本、版本不存在、或状态非 `READY` 失败。

### 2.3 API（已实现）
- `POST /api/runs/{runNo}/readiness/precheck`
- `POST /api/runs/{runNo}/readiness/check`
- `GET /api/runs/{runNo}/readiness/latest?type=PRECHECK|FORMAL`
- `GET /api/runs/{runNo}/readiness/history`
- `POST /api/runs/{runNo}/readiness/items/{itemId}/waive`
- `GET /api/readiness/exceptions`

### 2.4 权限（已实现）
| 权限 | 说明 |
|------|------|
| `readiness:view` | 查看检查结果 |
| `readiness:check` | 执行准备检查 |
| `readiness:override` | 豁免检查项 |
| `readiness:config` | 管理检查配置 |

### 2.5 Run 授权集成（已实现）
- 授权前执行 `canAuthorize`，若没有正式检查记录则自动触发一次正式检查。
- 仍有失败项时返回 `READINESS_CHECK_FAILED`。

### 2.6 自动触发（部分实现）
- [x] TPM 同步变更触发预检
- [x] 路由版本变更触发预检
- [ ] Run 创建后自动预检

### 2.7 UI（已实现/部分）
- [x] Run 详情页：准备状态卡片、检查项列表、豁免操作、执行预检/正式检查按钮
- [x] 异常汇总看板：准备异常列表（可筛选）
- [ ] 检查项配置页（可选，未实现）

---

## 3. Task Breakdown & Status

### 3.1 Task 2.1: Line Readiness Check

- [x] 2.1.1 Schema: `ReadinessCheck` + `ReadinessCheckItem` + enums
- [x] 2.1.2 Service: 设备检查逻辑 (TPM)
- [x] 2.1.3 Service: 物料检查逻辑 (BOM + Material)
- [x] 2.1.4 Service: 工艺路线检查逻辑 (ExecutableRouteVersion)
- [x] 2.1.5 API: 预检 + 正式检查 + 获取结果 + 历史
- [x] 2.1.6 API: 豁免接口 (waive)
- [x] 2.1.7 Gate: Run 授权前置检查
- [x] 2.1.8 权限: `mes:readiness:*` 权限常量
- [x] 2.1.9 事件: Run 创建时自动预检
- [x] 2.1.10 事件: TPM/路由变更时重新预检
- [x] 2.1.11 UI: Run 详情页准备状态卡片
- [x] 2.1.12 UI: 准备检查执行页（已整合在 Run 详情页）
- [x] 2.1.13 UI: 异常汇总看板

### 3.2 Task 2.2: FAI Tasks & Authorization Gate
- [x] 2.2.1 Schema: 验证/扩展 Inspection 模型 (FAI 特有字段)
- [x] 2.2.2 Service: FAI 任务创建逻辑 (限制试产数量)
- [x] 2.2.3 API: 创建 FAI 任务
- [x] 2.2.4 API: 记录检验结果
- [x] 2.2.5 API: 完成 FAI (PASS/FAIL)
- [x] 2.2.6 Gate: Run 授权需 FAI PASSED
- [ ] 2.2.7 UI: FAI 任务创建/执行页
- [ ] 2.2.8 UI: FAI 结果记录表单

### 3.3 Task 2.3: Defect & Disposition
- [x] 2.3.1 Schema: 验证/扩展 Defect + Disposition 模型
- [x] 2.3.2 Service: TrackOut FAIL 时自动创建 Defect
- [x] 2.3.3 Service: Disposition 处置流程 (REWORK/SCRAP/HOLD)
- [x] 2.3.4 API: 缺陷查询 + 创建
- [x] 2.3.5 API: 处置操作 (assign disposition)
- [x] 2.3.6 API: 返工任务管理
- [x] 2.3.7 API: Hold 释放
- [ ] 2.3.8 UI: 缺陷列表 + 处置操作
- [ ] 2.3.9 UI: 返工任务跟踪

### 3.4 Task 2.4: OQC Sampling Flow
- [ ] 2.4.1 Schema: OQC 抽检规则表 (比例/固定数量)
- [ ] 2.4.2 Service: OQC 任务创建逻辑 (Unit 完成后触发)
- [ ] 2.4.3 Service: OQC 抽样算法
- [ ] 2.4.4 API: OQC 任务管理
- [ ] 2.4.5 API: OQC 结果记录
- [ ] 2.4.6 Gate: Run/WO 完成需 OQC 通过
- [ ] 2.4.7 UI: OQC 任务列表 + 执行
- [ ] 2.4.8 UI: OQC 规则配置

### 3.5 Task 2.5: Final Confirmation & Closeout
- [ ] 2.5.1 Service: Run 完成条件检查 (所有门禁)
- [ ] 2.5.2 Service: WO 完成条件检查
- [ ] 2.5.3 API: Run closeout
- [ ] 2.5.4 API: WO closeout
- [ ] 2.5.5 UI: 关闭确认对话框
- [ ] 2.5.6 归档占位符 (后续扩展)

---

## 4. Review Notes / Gaps

- Run 创建后自动预检尚未实现（需求原始设计包含）。
- Readiness 权限尚未纳入任何默认角色，需要为运行/质量角色补齐。
- Readiness 配置页与配置 API 暂未实现。

---

## 5. References

- 端到端流程: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- 集成规范: `domain_docs/mes/spec/integration/01_system_integrations.md`
- Traceability: `domain_docs/mes/spec/traceability/01_traceability_contract.md`
- API 模式: `agent_docs/03_backend/api_patterns.md`
