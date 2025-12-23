# API Contracts: Execution

这个文件定义了与生产执行闭环相关的 API，包括工单/运行管理、门禁强控、以及设备/测试数据接入。

## 1. 工单与运行 (Work Order & Run)

### 接收工单 (ERP/APS)
**POST** `/api/integration/work-orders`
- **行为**: 幂等 upsert；记录 `IntegrationMessage`。
- **Payload**: 同执行契约文档原有内容，可选 `sourceSystem`（例如 `ERP` / `APS`）。

### 下发工单
**POST** `/api/work-orders/{woNo}/release`
- **Guard**: 状态必须为 `RECEIVED`。

### 创建生产运行 (Run)
**POST** `/api/work-orders/{woNo}/runs`
- **Guard**: 工单必须已 `RELEASED`。
- **结果**: Run 状态初始化为 `PREP`，工单状态更新为 `IN_PROGRESS`。

### 查询工单列表
**GET** `/api/work-orders`
- **Query**:
  - `page`, `pageSize`
  - `search` (工单号/产品编码)
  - `status` (逗号分隔)
  - `sort` (例如 `woNo.asc,createdAt.desc`)
- **结果**: `{ items, total, page, pageSize }`

### 查询运行列表
**GET** `/api/runs`
- **Query**:
  - `page`, `pageSize`
  - `search` (批次号/工单号)
  - `status` (逗号分隔)
  - `woNo`
  - `sort` (例如 `runNo.asc,workOrder.woNo.desc`)
- **结果**: `{ items, total, page, pageSize }`

### 查询工位列表
**GET** `/api/stations`
- **结果**: `{ items: [...] }` (包含 `code`, `name`, `stationType`, `line` -> `{ code, name } | null`)

---

## 2. 产线准备与门禁 (Gatekeeping)

### 提交准备检查项
**POST** `/api/runs/{runNo}/prep-checks`
```json
{ "type": "MATERIAL", "status": "PASS", "remark": "" }
```

### 创建/重置 FAI 任务
**POST** `/api/runs/{runNo}/fai`
```json
{ "reset": false }
```

### 提交 FAI 检验结果
**POST** `/api/runs/{runNo}/fai/inspect`
```json
{
  "status": "PASS",
  "data": { "measurements": [], "images": [], "comment": "OK" }
}
```
- **Guard**: 若失败，必须记录原因。

### 批量授权
**POST** `/api/runs/{runNo}/authorize`
```json
{ "action": "AUTHORIZE" }
```
- **Guard**: FAI 状态必须为 `PASS`（首件合格才授权批量生产）。
- **M1 简化**: 若 FAI 流程未启用，允许从 `PREP` 直接授权。

---

## 3. 过站执行 (Tracking)

### 手动站进出站 (MANUAL)
- **TrackIn**: `POST /api/stations/{stationCode}/track-in`
- **TrackOut**: `POST /api/stations/{stationCode}/track-out`
- **Guards**: 
  1. `Run=AUTHORIZED` (除非是 FAI 限定模式)
  2. `currentStepNo` 匹配
  3. 站点能力匹配（`stationGroupId` / `stationType`）
  4. `runNo` 与 `woNo` / `Unit` 绑定关系一致

**TrackIn Payload**
```json
{ "sn": "SN0001", "woNo": "WO001", "runNo": "RUN-WO001-..." }
```

**TrackOut Payload**
```json
{
  "sn": "SN0001",
  "runNo": "RUN-WO001-...",
  "result": "PASS",
  "operatorId": "OP-001",
  "data": [
    { "specName": "Peak Temperature", "valueNumber": 246.8 }
  ]
}
```
`specName` 对应当前工序 `DataCollectionSpec.name`。
`data` 支持 `valueNumber` / `valueText` / `valueBoolean` / `valueJson`，需与 `DataCollectionSpec.dataType` 匹配。

---

## 4. 自动化接入 (Ingest)

### 设备事件接入 (AUTO)
**POST** `/api/ingest/equipment/events`
```json
{
  "stationCode": "SMT-PNP-01",
  "sn": "SN0001",
  "type": "TRACK_OUT",
  "result": "PASS",
  "data": { "placementAccuracy": 0.03 }
}
```

### 批量站/载具接入 (BATCH)
**POST** `/api/ingest/batch/events`
```json
{
  "stationCode": "REFLOW-01",
  "carrierNo": "OVEN-LOT-01",
  "type": "TRACK_OUT",
  "result": "PASS",
  "sns": ["SN0001", "SN0002"],
  "data": { "peakTemp": 246.8 }
}
```

### 测试结果接入 (TEST)
**POST** `/api/ingest/test/results`
```json
{
  "stationCode": "ICT-01",
  "sn": "SN0001",
  "result": "FAIL",
  "measurements": [
    { "name": "Vout", "value": 4.85, "min": 4.9, "max": 5.1 }
  ]
}
```
