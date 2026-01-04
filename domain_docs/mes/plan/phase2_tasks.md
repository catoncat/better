# Phase 2 Plan (M2 - Execution Control & Quality) — Consolidated

> 状态：**执行中**
> 更新时间：2025-01-04
> 目标：准备检查门禁、上料防错、FAI、缺陷处置、OQC 抽检、集成接口、收尾关闭
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

### 1.2 Phase 2 其它模块进度
- ✅ FAI 首件检验：已完成（2025-01-02）
- ✅ 缺陷处置（Defect & Disposition）：已完成（2025-01-02）
- ⬜ 上料防错（Loading Verify）：未开始
- ⬜ OQC 抽检：未开始
- ⬜ 集成接口（Integration APIs）：未开始
- ⬜ Closeout 收尾：未开始

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
- [ ] 2.1.9 事件: Run 创建时自动预检
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
- [x] 2.2.7 UI: FAI 任务创建/执行页
- [x] 2.2.8 UI: FAI 结果记录表单
- [ ] 2.2.9 MRB FAI 豁免逻辑 (`authorizationType`, `mrbFaiWaiver`, `mrbWaiverReason`)

### 3.3 Task 2.3: Defect & Disposition
- [x] 2.3.1 Schema: 验证/扩展 Defect + Disposition 模型
- [x] 2.3.2 Service: TrackOut FAIL 时自动创建 Defect
- [x] 2.3.3 Service: Disposition 处置流程 (REWORK/SCRAP/HOLD)
- [x] 2.3.4 API: 缺陷查询 + 创建
- [x] 2.3.5 API: 处置操作 (assign disposition)
- [x] 2.3.6 API: 返工任务管理
- [x] 2.3.7 API: Hold 释放
- [x] 2.3.8 UI: 缺陷列表 + 处置操作
- [x] 2.3.9 UI: 返工任务跟踪

### 3.4 Task 2.4: Loading Verify (上料防错)

> 参考: `domain_docs/mes/spec/process/03_smp_flows.md` - MES 核心模块

- [ ] 2.4.1 Schema: `LoadingRecord` 模型 (站位、物料、绑定关系)
- [ ] 2.4.2 Schema: `FeederSlot` 站位表模型 (产线站位配置)
- [ ] 2.4.3 Service: 加载站位表逻辑 (基于路由/产线)
- [ ] 2.4.4 Service: 扫码验证逻辑 (物料码 + 站位码)
- [ ] 2.4.5 Service: BOM 比对逻辑 (BOM 物料 vs 实际上料)
- [ ] 2.4.6 Service: 绑定记录逻辑 (记录物料-站位绑定关系)
- [ ] 2.4.7 Service: 异常处理逻辑 (报警锁定、重试次数控制)
- [ ] 2.4.8 API: `POST /mes/loading/verify` 上料验证
- [ ] 2.4.9 API: `GET /mes/runs/{runNo}/loading` 获取上料记录
- [ ] 2.4.10 API: `GET /mes/lines/{lineId}/feeder-slots` 获取站位表
- [ ] 2.4.11 Gate: Run 授权前需完成上料验证 (可选门禁)
- [ ] 2.4.12 权限: `loading:view/verify/config`
- [ ] 2.4.13 UI: 上料防错执行页 (扫码界面)
- [ ] 2.4.14 UI: 上料记录查看 (Run 详情页标签)
- [ ] 2.4.15 UI: 站位表配置页 (可选)

### 3.5 Task 2.5: OQC Sampling Flow
- [ ] 2.5.1 Schema: OQC 抽检规则表 (比例/固定数量)
- [ ] 2.5.2 Service: OQC 任务创建逻辑 (Unit 完成后触发)
- [ ] 2.5.3 Service: OQC 抽样算法
- [ ] 2.5.4 API: OQC 任务管理
- [ ] 2.5.5 API: OQC 结果记录
- [ ] 2.5.6 Gate: Run/WO 完成需 OQC 通过 (含 MRB 分支: COMPLETED/CLOSED_REWORK/SCRAPPED)
- [ ] 2.5.7 UI: OQC 任务列表 + 执行
- [ ] 2.5.8 UI: OQC 规则配置
- [ ] 2.5.9 MRB 评审流程 (ON_HOLD → MRB decision → 终态)
- [ ] 2.5.10 返修 Run 创建 API (`POST /api/runs/{runNo}/rework`)
- [ ] 2.5.11 CLOSED_REWORK 状态变更逻辑
- [ ] 2.5.12 UI: MRB 决策对话框

### 3.6 Task 2.6: Integration APIs (集成接口)

> 参考: `domain_docs/mes/spec/process/03_smp_flows.md` - 集成接口规范
> 设计原则: MES 只接收结论状态，不管理外部系统生命周期；支持手动降级模式

- [ ] 2.6.1 Schema: `IntegrationRecord` 模型 (来源、类型、状态、审计)
- [ ] 2.6.2 Service: 钢网状态接收逻辑 (TPM → MES)
- [ ] 2.6.3 Service: 锡膏状态接收逻辑 (WMS → MES)
- [ ] 2.6.4 Service: 检测结果接收逻辑 (SPI/AOI → MES)
- [ ] 2.6.5 Service: 手动降级录入逻辑 (source: MANUAL)
- [ ] 2.6.6 API: `POST /mes/integration/stencil-status` 接收钢网状态
- [ ] 2.6.7 API: `POST /mes/integration/solder-paste-status` 接收锡膏状态
- [ ] 2.6.8 API: `POST /mes/integration/inspection-result` 接收检测结果
- [ ] 2.6.9 集成: 就绪检查读取集成状态 (钢网/锡膏)
- [ ] 2.6.10 集成: FAI/TrackOut 读取检测结果
- [ ] 2.6.11 权限: `integration:receive/config`
- [ ] 2.6.12 UI: 手动录入界面 (就绪检查页、执行页)
- [ ] 2.6.13 UI: 集成状态监控页 (可选)
- [ ] 2.6.14 审计: 数据来源标识 (AUTO/MANUAL) 追溯

### 3.7 Task 2.7: Final Confirmation & Closeout
- [ ] 2.7.1 Service: Run 终态判定 (COMPLETED / CLOSED_REWORK / SCRAPPED)
- [ ] 2.7.2 Service: WO 完成条件检查 (所有 Run 处于终态)
- [ ] 2.7.3 API: Run closeout
- [ ] 2.7.4 API: WO closeout
- [ ] 2.7.5 UI: 关闭确认对话框
- [ ] 2.7.6 归档占位符 (后续扩展)

### 3.8 Task 2.8: Status Enum Alignment

- [x] 2.8.1 Run/Unit/WO 状态枚举对齐 SMP v2.4
- [x] 2.8.2 旧状态数据迁移 (FAI_PENDING/RUNNING/FINISHING/ARCHIVED/OUT_PASSED/REWORK/HOLD/CANCELLED)

---

## 4. Review Notes / Gaps

- Run 创建后自动预检尚未实现（需求原始设计包含）。
- Readiness 权限尚未纳入任何默认角色，需要为运行/质量角色补齐。
- Readiness 配置页与配置 API 暂未实现。
- 上料防错（Loading Verify）为 MES 核心模块，需实现站位表、BOM 比对、绑定记录。
- 集成接口需支持手动降级模式，所有手动录入需标记 `source: MANUAL` 用于审计。

---

## 5. References

- 端到端流程: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- SMT 产线流程: `domain_docs/mes/spec/process/03_smp_flows.md`
- 集成规范: `domain_docs/mes/spec/integration/01_system_integrations.md`
- Traceability: `domain_docs/mes/spec/traceability/01_traceability_contract.md`
- API 模式: `agent_docs/03_backend/api_patterns.md`
