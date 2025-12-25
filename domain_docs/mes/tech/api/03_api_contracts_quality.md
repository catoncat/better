# API Contracts: Quality

此部分定义与质量控制相关的 API，包括不良登记、返修、隔离处理等。
响应包裹格式与错误结构遵循 `agent_docs/03_backend/api_patterns.md`。
幂等性：对所有写入接口建议使用 `Idempotency-Key` 以支持客户端重试。

## 1. 不良登记

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

## 3. 返修完成

**POST** `/api/rework/{reworkId}/complete`

### Header
`Idempotency-Key` (recommended)

### 请求示例
```json
{
  "doneBy": "OP002",
  "remark": "已重焊"
}
```

### 响应示例
```json
{
  "ok": true,
  "data": { "status": "DONE" }
}
```
