# Device Data Gateway (POC)

> 目标：为设备数采提供可落地的接入网关与最小可用的自动数据写入路径。

## 1. Scope

- **覆盖**：设备数据事件 → DataValue 写入（AUTO/MANUAL）。
- **不覆盖**：AUTO/BATCH/TEST 的完整 ingestMapping、自动 TrackIn/Out 执行。

## 2. Endpoint

`POST /api/integration/device-data`

### 2.1 Payload

```json
{
  "eventId": "evt_20250101_001",
  "eventTime": "2026-01-24T10:00:00Z",
  "source": "AUTO",
  "runNo": "RUN-2026-001",
  "unitSn": "SN-0001",
  "stationCode": "SMT-01",
  "stepNo": 10,
  "trackId": "trk_xxx",
  "carrierTrackId": null,
  "operationId": "op_xxx",
  "equipmentId": "EQ-01",
  "operatorId": null,
  "data": [
    {
      "specId": "spec_xxx",
      "specName": "Peak Temperature",
      "valueNumber": 245,
      "collectedAt": "2026-01-24T10:00:00Z"
    }
  ],
  "meta": {
    "raw": "payload"
  }
}
```

### 2.2 Resolution Rules

- **Idempotency**: `dedupeKey = device-data:{eventId}`. 同一事件返回 `isDuplicate=true`。
- **Track 解析**：
  - 优先 `trackId`；其次 `carrierTrackId`。
  - 若未提供，需 `runNo + unitSn + stationCode + stepNo` 用于解析 Track。
- **Spec 解析**：
  - 优先 `specId`。
  - 使用 `specName` 时需 `operationId`，或通过 Run 路由快照解析 `stepNo` → `operationId`。
  - 若步骤绑定了 `dataSpecIds`，仅允许写入绑定范围内的 Spec。
- **Source 校验**：`source=AUTO` 时仅允许写入 `method=AUTO` 的 Spec。

### 2.3 Output

返回 `dataValuesCreated`、`trackId`/`carrierTrackId`、`isDuplicate`。

## 3. Storage

- **DataValue**：写入 `source=TrackSource.AUTO`（或 MANUAL）。
- **IntegrationMessage**：写入原始事件用于追溯与去重。

## 4. Notes

- 当前为 POC：不涉及 ingestMapping 与自动 Track 执行。
- 后续可扩展为 AUTO/BATCH/TEST 通用 ingest pipeline。
