# Route Execution Config (MES-owned Execution Semantics)

> **更新时间**: 2025-01-02
> **实现状态**: ✅ M1.5 已完成，路由详情页可编辑执行配置

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

---

## 4. Gates: FAI and Authorization

If `requiresFAI=true`:
- the run must have a PASS FAI inspection before this step can execute.

If `requiresAuthorization=true`:
- the run must be authorized before this step can execute.

Routing Engine must reject otherwise:
- `FAI_REQUIRED`
- `RUN_NOT_AUTHORIZED`

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
