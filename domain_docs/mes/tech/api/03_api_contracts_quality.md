# API Contracts: Quality

此部分定义与质量控制相关的 API，包括不良登记、返修、隔离处理等。

## 1. 不良登记

**POST** `/api/defects`

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