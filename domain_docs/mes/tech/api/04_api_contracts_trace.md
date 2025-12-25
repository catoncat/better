# API Contracts: Traceability

响应包裹格式与错误结构遵循 `agent_docs/03_backend/api_patterns.md`。

## 1. 按 SN 查询全追溯

**GET** `/api/trace/units/{sn}`

### Query Params
- `mode`: `run` (default) | `latest`

### 响应示例
```json
{
  "ok": true,
  "data": {
    "unit": { "sn": "SN0001", "status": "DONE", "woNo": "WO..." },
    "route": { "code": "...", "sourceSystem": "ERP", "sourceKey": "..." },
    "routeVersion": { "id": "rv_001", "versionNo": 3, "compiledAt": "2025-01-01T00:00:00Z" },
    "steps": [
      {
        "stepNo": 10,
        "operationId": "op_001",
        "stationType": "MANUAL",
        "stationGroupId": "sg_001",
        "allowedStationIds": ["st_001", "st_002"],
        "requiresFAI": false,
        "requiresAuthorization": false,
        "dataSpecIds": ["dcs_001"]
      }
    ],
    "tracks": [
      { "stepNo": 1, "operation": "PRINT_PASTE", "inAt": "...", "outAt": "...", "result": "PASS" }
    ],
    "dataValues": [
      { "stepNo": 4, "name": "峰值温度", "value": 247.2, "judge": "PASS" }
    ],
    "defects": [],
    "materials": [
      { "position": "U1", "materialCode": "IC-xxx", "lotNo": "BATCH...", "isKeyPart": true }
    ],
    "snapshot": { "material_trace": {}, "process_info": {}, "inspection_results": {}, "repair_history": {} }
  }
}
```

## 2. 按关键料批次反查 SN

**GET** `/api/trace/material-lots/{materialCode}/{lotNo}/units`

### 响应示例
```json
{
  "ok": true,
  "data": {
    "units": [
      { "sn": "SN0001", "status": "DONE" },
      { "sn": "SN0002", "status": "IN_PROGRESS" }
    ]
  }
}
```
