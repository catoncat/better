# API Contracts: Execution

This document defines APIs and behaviors for the production execution closed loop:
- Work order / Run management
- Gatekeeping (prep, FAI, authorization)
- Station execution (track-in/out)
- Ingest (equipment/test/batch) entry points
- Routing selection + Run freeze semantics

Aligned with:
- `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- `domain_docs/mes/spec/routing/01_routing_engine.md`

All responses follow the envelope and error format defined in `agent_docs/03_backend/api_patterns.md`.
Error codes reference `domain_docs/mes/tech/api/01_api_overview.md` plus global codes.

---

## 1. Work Order & Run

### 1.1 Receive WorkOrder (ERP/APS)
**POST** `/api/integration/work-orders`

- Behavior: idempotent upsert; write `IntegrationMessage`
- Idempotency: `Idempotency-Key` header is required
- Result: work order in `RECEIVED`

Request example:
```json
{
  "woNo": "WO20250101-001",
  "productCode": "P-10001",
  "qty": 100,
  "dueDate": "2025-01-15T00:00:00Z"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "woNo": "WO20250101-001",
    "status": "RECEIVED"
  }
}
```

### 1.2 Release WorkOrder
**POST** `/api/work-orders/{woNo}/release`

- Guard: WO must be `RECEIVED`
- Recommended: routing resolution check:
  - must resolve a routing
  - routing must have at least one READY executable version
- If not: return `ROUTE_VERSION_NOT_READY` / `ROUTE_COMPILE_FAILED`

Request: none

Response example:
```json
{
  "ok": true,
  "data": {
    "woNo": "WO20250101-001",
    "status": "RELEASED"
  }
}
```

### 1.3 Create Run (Freeze Route Version)
**POST** `/api/work-orders/{woNo}/runs`

Behavior (required):
1) Resolve routing (see routing engine selection rules)
2) Select latest READY `ExecutableRouteVersion`
3) Persist `Run.routeVersionId`
4) Initialize run status `PREP`

Request example:
```json
{
  "lineCode": "LINE-A",
  "qty": 100
}
```

Response SHOULD include routing identity:
```json
{
  "ok": true,
  "data": {
    "runNo": "RUN20250101-01",
    "status": "PREP",
    "route": { "code": "100-241-184R", "sourceSystem": "ERP" },
    "routeVersion": { "versionNo": 3 }
  }
}
```

---

## 2. Gatekeeping (Prep / FAI / Authorization)

### 2.1 Submit PrepCheck item

**POST** `/api/runs/{runNo}/prep-checks`

* Stores prep status per type
* When all required checks pass, Run may proceed to FAI gating (if enabled)

Request example:
```json
{
  "type": "EQUIPMENT",
  "result": "PASS",
  "checkedBy": "OP001",
  "remark": "Ready"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "prepCheckId": "PC001",
    "status": "RECORDED"
  }
}
```

### 2.2 FAI lifecycle (M2+ if fully enforced)

FAI tasks are managed via `/api/fai`:

**POST** `/api/fai/run/{runNo}` (create task)
```json
{
  "sampleQty": 5,
  "remark": "First article"
}
```

**POST** `/api/fai/{faiId}/start`

**POST** `/api/fai/{faiId}/items`
```json
{
  "unitSn": "SN-001",
  "itemName": "Hole diameter",
  "itemSpec": "10.0 ± 0.1",
  "actualValue": "10.02",
  "result": "PASS",
  "remark": "OK"
}
```

**POST** `/api/fai/{faiId}/complete`
```json
{
  "decision": "PASS",
  "passedQty": 5,
  "failedQty": 0,
  "remark": "FAI passed"
}
```

Query endpoints:
* `GET /api/fai` (filter by `runNo`, `status`)
* `GET /api/fai/{faiId}`
* `GET /api/fai/run/{runNo}`

Routing Engine guard:
* If a step requires FAI, Track/ingest must reject until the **latest** FAI for the run is `PASS`.
* Run authorization uses the same rule and returns `FAI_NOT_PASSED` when blocked.

### 2.3 Authorization (Batch go-ahead)

**POST** `/api/runs/{runNo}/authorizations`

Routing Engine guard:

* If a step requires authorization, Track/ingest must reject until authorized.

Request example:
```json
{
  "authorizedBy": "SUP001",
  "remark": "Batch approved"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "authorizationId": "AUTH001",
    "status": "AUTHORIZED"
  }
}
```

---

## 3. Station Execution (Manual)

### 3.1 TrackIn

**POST** `/api/stations/{stationCode}/track-in`

Required inputs:

* `runNo`
* `sn`

Idempotency: `Idempotency-Key` header is required.

Guards (minimum):

* WO released
* Run exists and is valid
* Unit currentStepNo matches the step that station is allowed to execute (derived from frozen routeVersion snapshot)
* station allowed for the step

Request example:
```json
{
  "runNo": "RUN20250101-01",
  "sn": "SN0001"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "trackId": "TRK001",
    "status": "IN_STATION"
  }
}
```

### 3.2 TrackOut

**POST** `/api/stations/{stationCode}/track-out`

Required inputs:

* `runNo`
* `sn`
* `result`: PASS/FAIL

Idempotency: `Idempotency-Key` header is required.

PASS behavior:

* Create Track record
* Validate required data specs (if bound)
* Advance `Unit.currentStepNo` to the next stepNo based on sorted snapshot steps
* If no next step, set unit to DONE (M1)

FAIL behavior (M1):

* Create Track record
* Set unit to OUT_FAILED
* Do not advance

Request example:
```json
{
  "runNo": "RUN20250101-01",
  "sn": "SN0001",
  "result": "PASS"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "trackId": "TRK002",
    "status": "QUEUED"
  }
}
```

Note: if the step is the last step in the route, the unit status becomes `DONE`.

---

## 4. Ingest Execution (AUTO / BATCH / TEST)

### 4.1 Equipment event ingest (AUTO)

**POST** `/api/ingest/equipment-events`

* Idempotency required (`Idempotency-Key` header)
* Must map to route snapshot step semantics via execution config ingestMapping

Request example:
```json
{
  "eventId": "EVT001",
  "stationCode": "AUTO-01",
  "sn": "SN0001",
  "timestamp": "2025-01-01T08:00:00Z",
  "result": "PASS",
  "measurements": {
    "temp_peak": 247.2
  }
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "accepted": true,
    "trackId": "TRK100"
  }
}
```

### 4.2 Batch event ingest (BATCH)

**POST** `/api/ingest/batch-events`

* Produces CarrierTrack and optionally per-unit Tracks
* Idempotency required (`Idempotency-Key` header)
* Advances units according to snapshot steps (not +1)

Request example:
```json
{
  "batchId": "BATCH001",
  "carrierNo": "CARRIER-01",
  "sns": ["SN0001", "SN0002"],
  "timestamp": "2025-01-01T08:10:00Z",
  "result": "PASS"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "carrierTrackId": "CTR001",
    "acceptedCount": 2
  }
}
```

### 4.3 Test result ingest (TEST)

**POST** `/api/ingest/test-results`

* Must produce DataValue rows for measurements
* Must yield PASS/FAIL outcome for the step
* FAIL results set unit to OUT_FAILED (M1)
* Idempotency required (`Idempotency-Key` header)

Request example:
```json
{
  "testResultId": "TEST001",
  "stationCode": "TEST-01",
  "sn": "SN0001",
  "timestamp": "2025-01-01T08:20:00Z",
  "result": "PASS",
  "measurements": {
    "voltage": 3.3,
    "current": 0.2
  }
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "accepted": true,
    "dataValueCount": 2
  }
}
```

---

## 5. ERP Routing Updates (Execution Contract Guarantee)

* Runs use their frozen routeVersion; they must not be auto-upgraded.
* After ERP updates produce a new READY version:

  * new Runs use the new version
  * existing Runs remain on their original version
