# API Contracts: Quality

此部分定义与质量控制相关的 API，包括不良登记、返修、隔离处理等。
响应包裹格式与错误结构遵循 `agent_docs/03_backend/api_patterns.md`。
幂等性：对所有写入接口建议使用 `Idempotency-Key` 以支持客户端重试。

## 1. 不良登记

缺陷查询：

* `GET /api/defects`（列表，可按 `unitSn` / `code` / `status` 过滤）
* `GET /api/defects/{defectId}`（详情）

**POST** `/api/defects`

### Header
`Idempotency-Key` (recommended)

### 请求示例
```json
{
  "sn": "SN0001",
  "code": "SOLDER_BRIDGE",
  "location": "U1",
  "qty": 1,
  "trackId": "track_xxx",
  "meta": { "images": [] }
}
```

### 响应示例
```json
{
  "ok": true,
  "data": { "defectId": "DEF123", "status": "RECORDED" }
}
```

## 2. 处置判定

**POST** `/api/defects/{defectId}/disposition`

### Header
`Idempotency-Key` (recommended)

### 请求示例
```json
{
  "type": "REWORK",
  "reason": "重焊",
  "rework": { "toStepNo": 3 }
}
```

### 响应示例
```json
{
  "ok": true,
  "data": { "status": "DISPOSITIONED" }
}
```

缺陷放行/解锁（HOLD 释放）：

**POST** `/api/defects/{defectId}/release`

```json
{
  "reason": "放行原因"
}
```

---

## 3. 返工任务

* `GET /api/rework-tasks`（列表，可按 `unitSn` / `status` 过滤）
* `POST /api/rework-tasks/{taskId}/repair-record`（记录返修过程）
* `POST /api/rework-tasks/{taskId}/complete`（完成返工）

### Header
`Idempotency-Key` (recommended)

### 请求示例（完成返工）
```json
{
  "remark": "已重焊"
}
```

### 请求示例（记录返修过程）
```json
{
  "reason": "焊点虚焊",
  "action": "返工重焊",
  "result": "复检通过",
  "remark": "复检已完成"
}
```

### 响应示例
```json
{
  "ok": true,
  "data": { "status": "DONE" }
}
```

---

## 4. FQC（末件检验）

权限：`QUALITY_FAI`（当前实现）

FQC 用于末件抽检（Final Quality Check），通常在批次完成后执行。

* `GET  /api/fqc`（列表，可按 `runNo` / `status` 过滤）
* `GET  /api/fqc/{fqcId}`（详情）
* `GET  /api/fqc/run/{runNo}`（获取某个 Run 的最新 FQC）
* `POST /api/fqc/run/{runNo}`（创建 FQC 任务）
* `POST /api/fqc/{fqcId}/start`（开始检验）
* `POST /api/fqc/{fqcId}/items`（录入检验项）
* `POST /api/fqc/{fqcId}/complete`（完成检验：PASS / FAIL）
* `POST /api/fqc/{fqcId}/sign`（签字确认）

创建 FQC 任务约束：
- Run 状态需为 `IN_PROGRESS` / `ON_HOLD` / `COMPLETED` / `CLOSED_REWORK` / `SCRAPPED`。
- 所有 Unit 均为终态（DONE/SCRAPPED）。
- `sampleQty` 必须在 [1, DONE 数量] 范围内（默认 1）。

完成 FQC 行为：
- 更新 FQC 状态为 PASS/FAIL（不改变 Run 状态）。

签字：
- 记录签字人/时间与备注（可选）。

---

## 5. OQC（出货检验）

权限：`QUALITY_OQC`

### 5.1 抽检规则（Sampling Rules）

用于配置抽检策略（按 `productCode` / `lineId` / `routingId` 维度匹配），并支持优先级与启用/停用。

* `GET    /api/oqc/sampling-rules`
* `GET    /api/oqc/sampling-rules/{ruleId}`
* `POST   /api/oqc/sampling-rules`
* `PATCH  /api/oqc/sampling-rules/{ruleId}`
* `DELETE /api/oqc/sampling-rules/{ruleId}`（逻辑停用）

创建请求示例：
```json
{
  "productCode": "P-001",
  "lineId": "line_xxx",
  "routingId": "routing_xxx",
  "samplingType": "PERCENTAGE",
  "sampleValue": 10,
  "priority": 10,
  "isActive": true
}
```

### 5.2 OQC 任务（Inspection Task）

* `GET  /api/oqc`（列表，可按 `runNo` / `status` 过滤）
* `GET  /api/oqc/{oqcId}`（详情）
* `GET  /api/oqc/run/{runNo}`（获取某个 Run 的最新 OQC）
* `GET  /api/oqc/run/{runNo}/gate`（检查 Run 是否可完工）
* `POST /api/oqc/run/{runNo}`（手动创建 OQC 任务）
* `POST /api/oqc/{oqcId}/start`（开始检验）
* `POST /api/oqc/{oqcId}/items`（录入检验项）
* `POST /api/oqc/{oqcId}/complete`（完成检验：PASS / FAIL）

创建 OQC 任务约束：
- Run 必须为 `IN_PROGRESS`，且所有 Unit 均为 `DONE`，否则返回 `OQC_NOT_READY`。

完成 OQC 行为：
- `decision=PASS` → Run → `COMPLETED`
- `decision=FAIL` → Run → `ON_HOLD`（进入 MRB 处置）

录入检验项约束：
- `unitSn` 必须属于该 Run 且必须在抽样范围内，否则返回 `UNIT_NOT_IN_SAMPLE`。

---

## 6. MRB（批次处置）

权限：`QUALITY_DISPOSITION`

### 5.1 记录 MRB 决策

**POST** `/api/runs/{runNo}/mrb-decision`

用于对 `ON_HOLD` Run 进行处置闭环：
- `RELEASE` → Run → `COMPLETED`
- `REWORK` → Run → `CLOSED_REWORK`，并创建返修 Run（复用原 Unit）
- `SCRAP` → Run → `SCRAPPED`

请求示例：
```json
{
  "decision": "REWORK",
  "reworkType": "REUSE_PREP",
  "faiWaiver": true,
  "faiWaiverReason": "工艺参数微调，物料设备无变更",
  "reason": "工艺参数异常需返修"
}
```

约束：
- `reason` 最少 4 个字
- `decision=REWORK` 时必须提供 `reworkType`
- FAI 豁免仅允许 `reworkType=REUSE_PREP`，且需要 `faiWaiverReason`

常见错误码：
- `RUN_NOT_ON_HOLD`
- `REWORK_TYPE_REQUIRED`
- `FAI_WAIVER_REASON_REQUIRED`
- `FAI_WAIVER_NOT_ALLOWED`

### 5.2 查询返修批次

**GET** `/api/runs/{runNo}/rework-runs`

返回指定 `runNo`（作为 parent）的所有返修 Run 列表（按创建时间升序）。
