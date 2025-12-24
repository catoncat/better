# Route Versioning & Change Management (ERP Updates)

This document defines how MES handles routing updates from ERP while ensuring:
- in-flight production stability
- traceability correctness
- safe rollout of changes

---

## 1. Objects and Definitions

- Canonical route: `Routing + RoutingStep[]`
- Executable version: `ExecutableRouteVersion(snapshotJson, status)`
- Run freeze: `Run.routeVersionId`

---

## 2. Core Rules (Required)

1) A Run MUST freeze a route executable version at creation time.
2) ERP updates create new versions; they MUST NOT mutate the meaning of existing runs.
3) New runs use the latest READY version.
4) If new version compiles INVALID, older READY versions remain usable.

Version numbers increment only when the compiled snapshot changes:
- canonical step changes from ERP import
- execution config changes that alter execution semantics

---

## 3. Executable Snapshot (Minimum Shape)

`snapshotJson` MUST be self-contained for execution and trace:

```json
{
  "route": {
    "code": "100-241-184R",
    "sourceSystem": "ERP",
    "sourceKey": "ERP-ROUTE-001"
  },
  "routeVersion": {
    "versionNo": 3,
    "compiledAt": "2025-01-01T00:00:00Z"
  },
  "steps": [
    {
      "stepNo": 10,
      "operationId": "op_001",
      "stationType": "MANUAL",
      "stationGroupId": "sg_001",
      "allowedStationIds": ["st_001", "st_002"],
      "requiresFAI": false,
      "requiresAuthorization": false,
      "dataSpecIds": ["dcs_001"],
      "ingestMapping": null
    }
  ]
}
```

Notes:
- `steps[]` MUST be ordered by `stepNo` ascending.
- `allowedStationIds` MAY be empty; if both stationGroupId and allowedStationIds are null/empty, execution should be rejected at compile time.
- `ingestMapping` is required for AUTO/BATCH/TEST stationTypes.

---

## 4. ERP Change Types and Handling

### 4.1 Step added
- canonical adds a step
- execution semantics must resolve stationType and constraints
- otherwise compile is INVALID

### 4.2 Step removed
- canonical removes a step
- step-level configs become orphaned (kept for audit, not used)
- compile may still be READY if remaining steps are executable

### 4.3 Step order / stepNo changes
- prefer matching by `sourceStepKey` for inheritance
- if no match, treat as delete+add

### 4.4 Operation changes (processKey change)
- may require new mapping and may invalidate compile
- operation-level configs may provide defaults if mapping exists

---

## 5. Config Inheritance Strategy

Inheritance priority (same as execution config):
- step (sourceStepKey) > operation > route > global

Conflicts:
- if multiple step configs match, choose deterministic rule (e.g., latest updated)
- log an AuditEvent

---

## 6. Production Behavior Summary

- In-flight runs: unchanged
- New runs: use newest READY
- If newest is INVALID: continue using latest READY

No “auto-upgrade in-flight run” feature is allowed.

---

## 7. Traceability Requirement
Trace defaults to run-frozen routeVersion, not latest.
See `domain_docs/mes/spec/traceability/01_traceability_contract.md`.
