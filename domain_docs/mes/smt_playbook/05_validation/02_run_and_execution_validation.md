# 批次与执行验证步骤

## 1. 验证目标
覆盖工单→批次→就绪→FAI→授权→执行→完工的核心路径，确保状态流转和数据一致。

## 2. 前置数据
- 工单 WorkOrder（RELEASED）
- 路由版本（READY）
- 产线与站位配置完成
- 物料与映射已准备

## 3. 关键接口
- `POST /api/work-orders/:woNo/runs`
- `POST /api/runs/:runNo/generate-units`
- `POST /api/runs/:runNo/readiness/check`
- `POST /api/fai/run/:runNo`
- `POST /api/fai/:faiId/start`
- `POST /api/fai/:faiId/items`
- `POST /api/fai/:faiId/complete`
- `POST /api/runs/:runNo/authorize`
- `POST /api/stations/:stationCode/track-in`
- `POST /api/stations/:stationCode/track-out`

## 4. 工单 → 批次验证
### 4.1 创建批次
- 操作：`POST /api/work-orders/:woNo/runs`
- 期望：Run 状态 PREP
- 检查：
  - 绑定 routeVersionId
  - lineId 正确

## 5. Unit 生成验证
- 操作：`POST /api/runs/:runNo/generate-units`
- 期望：
  - SN 连续
  - Unit 状态 QUEUED
  - currentStepNo = 路由第一步
- 异常：超过 planQty 返回错误

## 6. 就绪检查验证
- 操作：`POST /api/runs/:runNo/readiness/check`
- 期望：
  - 未上料时 LOADING 失败
  - 上料完成后 LOADING 通过
- Run 状态仍保持 PREP

## 7. FAI 验证
### 7.1 创建 FAI
- 期望：就绪检查未通过时禁止创建

### 7.2 启动 FAI
- 期望：状态 PENDING → INSPECTING

### 7.3 试产与记录
- 完成 sampleQty 个 Unit 的 TrackIn/TrackOut
- 记录检验项后可完成判定

### 7.4 判定
- PASS：FAI 状态 PASS
- FAIL：FAI 状态 FAIL
- 若 SPI/AOI FAIL 存在，PASS 被阻断

## 8. 授权与执行验证
### 8.1 授权
- 操作：`POST /api/runs/:runNo/authorize`
- 期望：Run 状态 AUTHORIZED
- 若 FAI required 且未通过 → 授权失败

### 8.2 执行
- TrackIn → Unit 状态 IN_STATION
- TrackOut PASS → Unit 状态 DONE
- TrackOut FAIL → Unit 状态 OUT_FAILED

## 9. OQC 触发验证
### 9.1 无抽检规则
- 前置：删除该产品/产线的抽检规则
- 操作：让所有 Unit DONE/SCRAPPED
- 期望：Run 自动 COMPLETED（无 OQC）

### 9.2 有抽检规则
- 前置：配置抽检规则（PERCENTAGE 或 FIXED）
- 操作：所有 Unit DONE/SCRAPPED
- 期望：创建 OQC 任务，sampleSize 与 sampledUnitIds 记录在 OQC 数据中

### 9.3 样本数量为 0
- 前置：抽检规则导致 sampleSize=0
- 期望：Run 自动 COMPLETED（不创建 OQC）

## 10. OQC 执行与判定验证
### 10.1 启动 OQC
- 操作：`POST /api/oqc/:oqcId/start`
- 期望：状态 PENDING → INSPECTING

### 10.2 记录检验项
- 操作：`POST /api/oqc/:oqcId/items`
- 期望：仅允许 sampledUnitIds 中的 unitSn

### 10.3 完成 OQC
- 操作：`POST /api/oqc/:oqcId/complete`
- PASS：Run → COMPLETED
- FAIL：Run → ON_HOLD，进入 MRB 决策
