# 演示批次生成步骤（SMT）

## 0. 示例数据集定义（可直接复用）
- 产线：`SMT-A`
- 产品：`5223029018`（BOT）
- 路由：`SMT-BOT-标准路由`
- 工单：`WO-20250526-001`
- 批次：`RUN-WO-20250526-001-01`

### 站位（FeederSlot）示例
| 站位码 | 名称 | 顺序 |
|---|---|---|
| 2F-46 | 贴片机2 前排 46 | 10 |
| 2F-34 | 贴片机2 前排 34 | 20 |
| 1R-14 | 贴片机1 后排 14 | 30 |
| 1F-46 | 贴片机1 前排 46 | 40 |

### 物料映射（SlotMaterialMapping）示例
| 站位 | 物料编码 | 产品 | 路由 | 优先级 | 替代料 |
|---|---|---|---|---|---|
| 2F-46 | 5212090001 | 5223029018 | SMT-BOT-标准路由 | 1 | 否 |
| 2F-46 | 5212090001B | 5223029018 | SMT-BOT-标准路由 | 2 | 是 |
| 2F-34 | 5212090007 | 5223029018 | SMT-BOT-标准路由 | 1 | 否 |
| 1R-14 | 5212098001 | 5223029018 | SMT-BOT-标准路由 | 1 | 否 |
| 1F-46 | 5212098004 | 5223029018 | SMT-BOT-标准路由 | 1 | 否 |

### 物料批次（MaterialLot）示例
- `5212090001|LOT-20250526-001`
- `5212090001B|LOT-20250526-002`
- `5212090007|LOT-20250526-003`
- `5212098001|LOT-20250526-004`
- `5212098004|LOT-20250526-005`

---

## 1. 配置数据准备
### 1.1 创建产线与站位
- 在 `/mes/loading/slot-config` 创建 Line 与 FeederSlot。
- 数据生成：Line + FeederSlot
- 数据管理：配置数据，可修改

### 1.2 维护物料映射
- 在 `/mes/loading/slot-config` → “物料映射”录入映射规则。
- 数据生成：SlotMaterialMapping
- 数据管理：配置数据，可修改

### 1.3 导入物料与路由
- 导入 Material（物料主数据）与 Routing/RouteVersion。
- 数据生成：Material、Routing、ExecutableRouteVersion
- 数据管理：ERP 同步为主

---

## 2. 工单与批次创建
### 2.1 创建工单
- 工单号：`WO-20250526-001`
- 产品编码：`5223029018`
- 状态：RELEASED
- 数据生成：WorkOrder

### 2.2 创建 Run
- 批次号：`RUN-WO-20250526-001-01`
- 产线：SMT-A
- 绑定路由版本（READY）
- 状态：PREP
- 数据生成：Run

---

## 3. 生成 Unit（SN）
- 调用：`POST /api/runs/:runNo/generate-units`
- 数量：50
- 生成 SN：`SN-RUN-WO-20250526-001-01-0001` …
- 数据生成：Unit（status=QUEUED）

---

## 4. 就绪检查
- 调用：`POST /api/runs/:runNo/readiness/check`
- 确保通过（STENCIL/SOLDER_PASTE/EQUIPMENT/MATERIAL/ROUTE/LOADING）。
- 此阶段 LOADING 可暂为失败（未上料）。

---

## 5. 上料防错
### 5.1 加载站位表
- 调用：`POST /api/runs/:runNo/loading/load-table`
- 数据生成：RunSlotExpectation（每站位一条，status=PENDING）

### 5.2 扫码验证（PASS）
- 站位：`2F-34`
- 条码：`5212090007|LOT-20250526-003`
- 结果：PASS → LOADED
- 数据更新：RunSlotExpectation + FeederSlot + LoadingRecord

### 5.3 扫码验证（WARNING 替代料）
- 站位：`2F-46`
- 条码：`5212090001B|LOT-20250526-002`
- 结果：WARNING → LOADED（替代料）
- 数据更新：RunSlotExpectation + FeederSlot + LoadingRecord

### 5.4 扫码验证（FAIL + 锁定）
- 站位：`1R-14`
- 条码：`9999999999|LOT-FAIL-001`
- 连续 3 次 → 站位锁定
- 数据更新：FeederSlot.isLocked=true

### 5.5 解锁与重试
- 调用：`POST /api/feeder-slots/:slotId/unlock`
- 重新扫码正确料

### 5.6 换料
- 调用：`POST /api/loading/replace`
- 必填 `reason`，可填 `packageQty`
- 数据生成：新 LoadingRecord（旧记录标记 REPLACED）

---

## 6. FAI 流程
### 6.1 创建 FAI
- 调用：`POST /api/fai/run/:runNo`
- sampleQty=2

### 6.2 启动 FAI
- 调用：`POST /api/fai/:faiId/start`

### 6.3 首件试产
- 完成 2 个 Unit 的 TrackIn/TrackOut

### 6.4 记录检验项
- 调用：`POST /api/fai/:faiId/items`
- 示例：
  - “锡膏厚度” PASS
  - “焊点质量” PASS

### 6.5 判定 FAI
- 调用：`POST /api/fai/:faiId/complete`
- decision=PASS

---

## 7. Run 授权与批量执行
- 授权：`POST /api/runs/:runNo/authorize`
- 执行：`/api/stations/:stationCode/track-in` + `track-out`
- 数据生成：Track + DataValue

---

## 8. OQC 抽检与完工
### 8.1 创建抽检规则
- `PERCENTAGE 10%` 或 `FIXED 5`

### 8.2 触发 OQC
- 所有 Unit DONE 后自动触发 OQC

### 8.3 记录 OQC 检验项并完成
- `POST /api/oqc/:oqcId/items`
- `POST /api/oqc/:oqcId/complete`
- PASS → Run 完工
- FAIL → Run ON_HOLD → MRB 决策

---

## 9. Trace 验证
- 查询：`GET /api/trace/units/{sn}`
- 核对：loadingRecords + inspections + tracks + routeVersion

---

## 10. 生成多批次场景（建议）
- Run A：上料 PASS + FAI PASS + OQC PASS
- Run B：上料 FAIL/锁定 + 换料 + FAI FAIL
- Run C：无抽检规则，Run 直接完工
