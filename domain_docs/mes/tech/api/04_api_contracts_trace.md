# API Contracts: Traceability

## 1. 按 SN 查询全追溯

**GET** `/api/trace/units/{sn}`

### 响应示例
```json
{
  "unit": { "sn": "SN0001", "status": "DONE", "woNo": "WO..." },
  "routing": { "routingCode": "..." },
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
```

## 2. 按关键料批次反查 SN

**GET** `/api/trace/material-lots/{materialCode}/{lotNo}/units`

### 响应示例
```json
{
  "units": [
    { "sn": "SN0001", "status": "DONE" },
    { "sn": "SN0002", "status": "IN_PROGRESS" }
  ]
}
```