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

- Behavior: idempotent upsert by `woNo`
- Idempotency: request is idempotent by `woNo` (no `Idempotency-Key` requirement)
- Result: new work order is created in `RECEIVED`; existing work order fields are updated

Request example:
```json
{
  "woNo": "WO20250101-001",
  "productCode": "P-10001",
  "plannedQty": 100,
  "routingCode": "ROUTE-001",
  "sourceSystem": "ERP",
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
- If not: return `ROUTE_NOT_FOUND` / `ROUTE_NOT_READY`
- Dispatch: release is a “派工” action; persist the chosen target line on the WorkOrder (stored in `WorkOrder.meta.dispatch.*`)

Request example:
```json
{
  "lineCode": "LINE-A"
}
```

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
5) Validate selected line is compatible with the frozen route snapshot (station group / allowed stations / station type)

Request example:
```json
{
  "lineCode": "LINE-A",
  "shiftCode": "Day",
  "changeoverNo": "CHG-001"
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

## 2. Gatekeeping (Readiness / FAI / Authorization)

### 2.1 Readiness Check (Precheck / Formal)

**POST** `/api/runs/{runNo}/readiness/precheck`

- Creates a PRECHECK record (non-blocking); used for early warning after run creation and upstream changes.

**POST** `/api/runs/{runNo}/readiness/check`

- Creates a FORMAL record (blocking); UI 当前默认仅触发 precheck，formal 可通过接口或授权自动触发。
- Run authorization calls `canAuthorize` and will auto-trigger a FORMAL check if none exists.

Query / exception endpoints:
- `GET /api/runs/{runNo}/readiness/latest?type=PRECHECK|FORMAL`
- `GET /api/runs/{runNo}/readiness/history`
- `POST /api/runs/{runNo}/readiness/items/{itemId}/waive`
- `GET /api/readiness/exceptions`

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

Run-level gate (as-built):
* If any compiled step has `requiresFAI=true`, Run authorization is blocked until the latest FAI is `PASS` (`FAI_NOT_PASSED`).
* MANUAL TrackIn/TrackOut requires Run status `AUTHORIZED`/`IN_PROGRESS`, so FAI is effectively enforced before the first TrackIn (via authorization), not per-step.

### 2.3 Authorization (Batch go-ahead)

**POST** `/api/runs/{runNo}/authorize`

Run-level gate (as-built):
* MANUAL TrackIn/TrackOut requires Run status `AUTHORIZED`/`IN_PROGRESS` (`RUN_NOT_AUTHORIZED`).
* Step-level `requiresAuthorization` is stored in the snapshot but not yet enforced (reserved for ingest/AUTO/BATCH/TEST).

Request example:
```json
{
  "action": "AUTHORIZE",
  "reason": "Batch approved"
}
```

Revoke example:
```json
{ "action": "REVOKE", "reason": "Rework needed" }
```

### 2.4 Rework Run (MRB Decision) [M2]

**POST** `/api/runs/{runNo}/rework`

Creates a rework Run from an original Run that was placed ON_HOLD due to OQC failure.
Only available when the original Run is in `ON_HOLD` status.

> **Note**: If you use `POST /api/runs/{runNo}/mrb-decision` with `decision=REWORK`, the server creates the rework Run automatically.
> This endpoint exists for explicit rework creation when you already have the OQC inspection reference.

Request example:
```json
{
  "reworkType": "REUSE_PREP",
  "mrbDecisionId": "MRB-20250103-001",
  "faiWaiver": true,
  "waiverReason": "工艺参数微调，物料设备无变更"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reworkType` | enum | Yes | `REUSE_PREP` (skip to AUTHORIZED) or `FULL_PREP` (start from PREP) |
| `mrbDecisionId` | string | Yes | Reference to the failed OQC inspection (used as the MRB decision anchor) |
| `faiWaiver` | boolean | No | Whether to waive FAI for this rework Run (only valid for `REUSE_PREP`) |
| `waiverReason` | string | Conditional | Required if `faiWaiver` is true |

> **Field Mapping**: Request uses short names (`faiWaiver`, `waiverReason`), model uses prefixed names (`mrbFaiWaiver`, `mrbWaiverReason`) to clarify MRB context in database.

Response example:
```json
{
  "ok": true,
  "data": {
    "reworkRunNo": "RUN20250101-01-RW1",
    "status": "AUTHORIZED",
    "authorizationType": "MRB_OVERRIDE",
    "mrbFaiWaiver": true,
    "parentRunNo": "RUN20250101-01",
    "parentRunStatus": "CLOSED_REWORK"
  }
}
```

Behavior:
1. Original Run status: `ON_HOLD` → `CLOSED_REWORK`
2. New rework Run created with `parentRunId` pointing to original
3. If `reworkType === 'REUSE_PREP'`:
   - New Run status = `AUTHORIZED`
   - `authorizationType` = `MRB_OVERRIDE`
   - FAI gate bypassed if `faiWaiver === true`
4. If `reworkType === 'FULL_PREP'`:
   - New Run status = `PREP`
   - Must complete full FAI/authorization flow

Error codes:
* `RUN_NOT_ON_HOLD` - Original Run is not in ON_HOLD status
* `MRB_DECISION_REQUIRED` - Missing mrbDecisionId
* `INVALID_MRB_DECISION` - mrbDecisionId does not reference a failed OQC inspection for this run
* `FAI_WAIVER_REASON_REQUIRED` - faiWaiver is true but waiverReason missing
* `FAI_WAIVER_NOT_ALLOWED` - FAI waiver is not allowed for this request
* `FORBIDDEN` - Caller lacks `QUALITY_DISPOSITION` permission

---

## 3. Station Execution (Manual)

### 3.1 TrackIn

**POST** `/api/stations/{stationCode}/track-in`

Required inputs:

* `runNo`
* `woNo`
* `sn`

Guards (minimum):

* WO released
* Run exists and is valid
* Unit currentStepNo matches the step that station is allowed to execute (derived from frozen routeVersion snapshot)
* station allowed for the step

Request example:
```json
{
  "runNo": "RUN20250101-01",
  "woNo": "WO20250101-001",
  "sn": "SN0001"
}
```

Response example:
```json
{
  "ok": true,
  "data": {
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
  "result": "PASS",
  "operatorId": "OP001",
  "data": [
    { "specName": "TEMP", "valueNumber": 247.2 }
  ]
}
```

Response example:
```json
{
  "ok": true,
  "data": {
    "status": "QUEUED"
  }
}
```

Note: if the step is the last step in the route, the unit status becomes `DONE`.

---

## 4. Ingest Events (AUTO/BATCH/TEST) [M4 Planned]

Ingest events are the entry point for AUTO/BATCH/TEST execution.
They are idempotent and persisted for trace.

### 4.1 Create Ingest Event

**POST** `/api/ingest/events`

Request (minimal):
```json
{
  "dedupeKey": "EQP-123456",
  "sourceSystem": "EQP-AOI-01",
  "eventType": "AUTO",
  "occurredAt": "2026-01-24T09:00:00Z",
  "payload": {}
}
```

Optional fields:
- `runNo` (if source knows the run)
- `meta` (JSON)

Behavior:
- Idempotent by `(sourceSystem, dedupeKey)`.
- Persist raw event payload.
- Normalize via `ingestMapping` from the route snapshot (AUTO/BATCH/TEST).
- On duplicate, return the existing event and do not create duplicate side effects.

Resolution (planned):
- If `runNo` is provided, use that Run's frozen `routeVersion` snapshot.
- If `runNo` is absent, require `sn` to be resolvable from the normalized payload (`snPath`).
- For BATCH events, all `snList` units must resolve to the same Run (else `RUN_MISMATCH`).
- If no Run can be resolved, return `RUN_NOT_FOUND` or `UNIT_RUN_NOT_FOUND`.

Response example:
```json
{
  "ok": true,
  "data": {
    "eventId": "ie_001",
    "duplicate": false,
    "status": "RECEIVED"
  }
}
```

Error examples (planned):
- `INGEST_MAPPING_MISSING`
- `INGEST_PAYLOAD_INVALID`
- `RUN_NOT_FOUND`
- `UNIT_RUN_NOT_FOUND`
- `RUN_MISMATCH`

---

## 5. ERP Routing Updates (Execution Contract Guarantee)

* Runs use their frozen routeVersion; they must not be auto-upgraded.
* After ERP updates produce a new READY version:

  * new Runs use the new version
  * existing Runs remain on their original version
