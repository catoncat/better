# Route Execution Config (MES-owned Execution Semantics)

> **更新时间**: 2026-01-28

This document defines how MES configures runtime execution semantics without changing the canonical step sequence from ERP (2B).
Execution semantics are configured here for all routes, regardless of source system.

---

## 1. What “Execution Semantics” Means

Execution semantics answer:
- How the step is executed (MANUAL/AUTO/BATCH/TEST)
- Which stations / station groups are allowed
- Whether FAI or authorization is required
- What data must be collected and validated
- How ingest events map into step execution
- Which FAI template is bound to the route (route-level, single template)

RoutingStep only defines the sequence; `RouteExecutionConfig` defines execution behavior.

---

## 2. Configuration Model

### 2.1 Config entity
`RouteExecutionConfig` is the authoritative configuration row for execution semantics.

### 2.2 Scope and precedence (highest to lowest)
1) Step-level (`routingStepId` or `sourceStepKey`)
2) Operation-level (`operationId`)
3) Route-level (`routingId`)
4) Global defaults

Merge rule:
- Higher precedence non-null fields override lower precedence.

Only `RouteExecutionConfig` is used to derive stationType, station constraints, gates, and data collection bindings.
FAI template binding is configured at the route level and compiled into the executable snapshot.

Example flow:
1) ERP (or MES-native) defines step sequence in `RoutingStep`.
2) MES configures execution semantics in `RouteExecutionConfig`.
3) Compile merges them into an executable snapshot used by Runs.

Conflict rule (same precedence):
- If multiple configs match the same scope, pick the one with the latest `updatedAt`.
- If still tied, pick the highest id (lexicographic) for determinism.

---

## 3. Required Fields by StationType

### 3.1 MANUAL
Minimum:
- stationType=MANUAL
- station constraint:
  - either stationGroupId or explicit allowedStationIds

### 3.2 AUTO
Minimum:
- stationType=AUTO
- ingestMapping present:
  - how to derive `sn`, `station`, `timestamp`, `result`, and measurement values
- station constraints recommended (at least stationGroupId)

### 3.3 BATCH
Minimum:
- stationType=BATCH
- ingestMapping present:
  - carrier id, list of sns, timestamps, result
- batch transaction policy:
  - all-or-nothing vs partial accept (documented in ingestMapping)

### 3.4 TEST
Minimum:
- stationType=TEST
- ingestMapping present:
  - testResultId idempotency
  - measurements → DataCollectionSpec mapping
  - step PASS/FAIL extraction

### 3.5 IngestMapping Schema (M4 Planned)

`ingestMapping` is JSON stored on `RouteExecutionConfig` and compiled into the route snapshot.
It defines how to extract normalized fields from the ingest payload.

Path syntax:
- Use dot-paths relative to the ingest event root (raw payload is under `payload.*`)
- Arrays can use `[*]` to indicate list extraction (e.g. `payload.units[*].sn`)

Common shape:
```json
{
  "eventType": "AUTO",
  "occurredAtPath": "payload.eventTime",
  "stationCodePath": "payload.device.stationCode",
  "lineCodePath": "payload.lineCode",
  "snPath": "payload.sn",
  "result": { "path": "payload.result", "passValues": ["PASS"], "failValues": ["FAIL"] },
  "measurements": {
    "itemsPath": "payload.measurements",
    "namePath": "name",
    "valuePath": "value",
    "unitPath": "unit",
    "judgePath": "judge"
  },
  "dataSpecMap": { "PeakTemp": "TEMP" }
}
```

Notes:
- `eventType` is optional; when present it MUST match the step `stationType` (AUTO/BATCH/TEST).
- `dataSpecMap` values map to `DataCollectionSpec.name` (same as `specName` used by TrackOut).

AUTO required fields:
- `snPath`
- `stationCodePath`
- `occurredAtPath`
- `result`
- `measurements` (optional if no dataSpecIds)

BATCH additions:
- `carrierCodePath`
- `snListPath` (list of units or `itemsPath` with `snPath`)
- `batchPolicy`: `ALL_OR_NOTHING` | `PARTIAL`
- Station constraint enforcement:
  - If the step uses `stationGroupId` or `allowedStationIds`, `stationCodePath` MUST be present and resolvable.
  - If no station constraints are configured (not recommended), `stationCodePath` is optional.

Defaults:
- If `batchPolicy` is omitted, MES treats it as `ALL_OR_NOTHING`.

TEST additions:
- `testResultIdPath` (source idempotency)
- `measurements` should map to DataCollectionSpec (via `dataSpecMap`)

Idempotency:
- `dedupeKey` is required at ingest API level; for TEST, recommend using `testResultId` as `dedupeKey`.
- For AUTO/BATCH, recommend using stable equipment event IDs (or carrier batch IDs) as `dedupeKey`.

Example (TEST):
```json
{
  "eventType": "TEST",
  "testResultIdPath": "payload.testResultId",
  "occurredAtPath": "payload.completedAt",
  "stationCodePath": "payload.station",
  "snPath": "payload.sn",
  "result": { "path": "payload.judge", "passValues": ["PASS"], "failValues": ["FAIL"] },
  "measurements": {
    "itemsPath": "payload.items",
    "namePath": "name",
    "valuePath": "value",
    "unitPath": "unit",
    "judgePath": "judge"
  },
  "dataSpecMap": { "Voltage": "VOLTAGE", "Current": "CURRENT" }
}
```

---

## 4. Gates: FAI and Authorization

If `requiresFAI=true`, it marks the step as requiring an FAI gate in the compiled snapshot.

Current behavior (as-built):
- FAI is a Run-level gate: if any compiled step has `requiresFAI=true`, Run authorization is blocked until the latest FAI is `PASS` (`FAI_NOT_PASSED`).
- MANUAL TrackIn/TrackOut requires Run status `AUTHORIZED`/`IN_PROGRESS` (`RUN_NOT_AUTHORIZED`), so authorization currently behaves as a Run-level mandatory gate for execution.
- Step-level `requiresAuthorization` is stored in the snapshot but not yet enforced (reserved for ingest/AUTO/BATCH/TEST).

### 4.1 FAI Template Binding
Route-level FAI template binding rules:
- Each route may bind one FAI template (per product).
- Template is stored on `Routing.faiTemplateId` and compiled into the route snapshot.
- The snapshot carries a template snapshot for traceability and stable execution.
- If any step requires FAI but the route has no template, compilation may still succeed (warn only).

Snapshot shape (partial):
```json
{
  "route": {
    "code": "ROUTE-SMT-PRDA",
    "sourceSystem": "MES",
    "sourceKey": null,
    "faiTemplate": {
      "id": "fai_tpl_001",
      "code": "FAI-PRDA-V1",
      "name": "产品A首件模板",
      "productCode": "PRD-A",
      "version": "V1",
      "items": [
        { "id": "item_1", "seq": 1, "itemName": "物料一致性", "itemSpec": "BOM核对", "required": true }
      ]
    }
  }
}
```

---

## 5. Data Collection Binding

`dataSpecIds` binds one or more `DataCollectionSpec`.
At TrackOut / ingest:
- required specs must be satisfied
- DataValue must be stored and linked to Track/CarrierTrack

If alarm policy requires HOLD:
- M1: reject with an error and block advance
- M2+: enter ON_HOLD loop

---

## 6. ERP Updates and Config Inheritance

To preserve step-level config across ERP updates:
- prefer `sourceStepKey` on config rows

Recommended stable key:
`ERP:{routeNo}:{operNumber}:{processKey}`

`sourceStepKey` is stored on `RoutingStep` as an explicit column.

When ERP updates:
- unchanged steps keep inheriting config
- new steps require config, otherwise compile becomes INVALID

---

## 7. Suggested Endpoints
- `GET  /api/routes/{routingCode}/execution-config`
- `POST /api/routes/{routingCode}/execution-config`
- `PATCH /api/routes/{routingCode}/execution-config/{configId}`
- `POST /api/routes/{routingCode}/compile`
