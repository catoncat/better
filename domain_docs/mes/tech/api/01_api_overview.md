# MES API Overview

This document outlines the specific API domains and error codes for the MES (Manufacturing Execution System) domain.
It adheres to `agent_docs/03_backend/api_patterns.md`.

Global API rules (response envelope, error format, audit, idempotency) are defined in the API patterns doc and apply to all MES endpoints.

---

## 1. MES Specific Error Codes

MES APIs use specific error codes to indicate business logic failures.
Standard errors (e.g. `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`) follow the global API patterns.

### 1.1 Execution Errors
*   `WO_NOT_RELEASED`: Work Order must be in RELEASED state to proceed.
*   `RUN_NOT_AUTHORIZED`: Production Run requires authorization (and potentially FAI) before execution.
*   `RUN_NOT_ON_HOLD`: Rework operation requires Run to be in ON_HOLD status.
*   `FAI_REQUIRED`: Step execution blocked because First Article Inspection is pending or failed.
*   `FAI_NOT_PASSED`: Run authorization blocked because required FAI is missing or not passed.
*   `FAI_WAIVER_REASON_REQUIRED`: MRB FAI waiver requested but waiver reason not provided.
*   `FAI_WAIVER_NOT_ALLOWED`: MRB FAI waiver not allowed (permission or request constraints).
*   `INVALID_MRB_DECISION`: MRB decision reference is missing or does not point to a failed OQC inspection for the run.
*   `MRB_DECISION_REQUIRED`: Rework operation requires MRB decision reference.
*   `NO_FAILED_OQC`: MRB decision requires a failed OQC inspection for the run.
*   `OQC_NOT_READY`: OQC creation requires Run IN_PROGRESS with all units DONE.
*   `REWORK_TYPE_REQUIRED`: MRB REWORK decision requires `reworkType`.
*   `STEP_MISMATCH`: The unit is not at the correct step for this operation.
*   `STATION_NOT_ALLOWED`: The selected station is not valid for the current step.
*   `TPM_EQUIPMENT_UNAVAILABLE`: Equipment status from TPM is not `normal`.
*   `TPM_MAINTENANCE_IN_PROGRESS`: Equipment has an in-progress TPM maintenance task.
*   `REQUIRED_DATA_MISSING`: Mandatory data collection fields were not provided.
*   `UNIT_NOT_IN_STATION`: Attempted TrackOut but unit was not tracked in.
*   `UNIT_NOT_IN_SAMPLE`: OQC record attempted for a unit not in the sampled list.

### 1.2 Routing Integration Errors
*   `ROUTE_NOT_FOUND`: The requested routing definition does not exist.
*   `ROUTE_SOURCE_READONLY`: Attempted to modify an ERP-sourced routing sequence (forbidden).
*   `ROUTE_VERSION_NOT_READY`: No executable route version exists for this routing.
*   `ROUTE_COMPILE_FAILED`: Internal error while compiling execution semantics.
*   `MAPPING_MISSING`: ERP process key or work center could not be mapped to MES master data.

---

## 2. API Domains (Routing-Centric)

The MES API is divided into the following functional areas:

### 2.1 ERP Routing Ingestion (source-of-truth)
*   `POST /api/integration/erp/routes/import` (push import)
*   `POST /api/integration/erp/routes/sync` (pull trigger initiated by MES)
*   `GET  /api/routes/{routingCode}/source` (raw + normalized summary)

### 2.2 ERP Master Data Ingestion
*   `POST /api/integration/erp/work-orders/sync`
*   `POST /api/integration/erp/materials/sync`
*   `POST /api/integration/erp/boms/sync`
*   `POST /api/integration/erp/work-centers/sync`

### 2.3 TPM Integration (inbound)
*   `POST /api/integration/tpm/equipment/sync`
*   `POST /api/integration/tpm/status-logs/sync`
*   `POST /api/integration/tpm/maintenance-tasks/sync`

### 2.4 Integration Status
*   `GET /api/integration/status` (sync cursor + latest cron outcome)

### 2.5 MES Routing Management (native)
*   `POST /api/routes` (create MES-native routing)
*   `PATCH /api/routes/{routingCode}` (edit header, native only)
*   `POST /api/routes/{routingCode}/steps` (edit steps, native only)
*   `POST /api/routes/{routingCode}/compile` (compile to executable version)
*   `GET  /api/routes` (list routing definitions)
*   `GET  /api/routes/{routingCode}` (routing detail + steps)

### 2.6 Execution Semantics Configuration (MES-owned)
*   `GET  /api/routes/{routingCode}/execution-config`
*   `POST /api/routes/{routingCode}/execution-config`
*   `PATCH /api/routes/{routingCode}/execution-config/{configId}`
*   `POST /api/routes/{routingCode}/compile` (after config change)

### 2.7 Versions (Run freeze)
*   `GET /api/routes/{routingCode}/versions`
*   `GET /api/routes/{routingCode}/versions/{versionNo}`

### 2.8 Station & Group Lookup
*   `GET /api/stations`
*   `GET /api/stations/groups`
*   `GET /api/stations/{stationCode}/queue` (units currently in station)

### 2.9 Traceability
*   `GET /api/trace/units/{sn}` (full unit trace with route version, tracks, data values, defects, materials)

### 2.10 Run Management
*   `GET /api/runs` (list runs with pagination and filtering)
*   `GET /api/runs/{runNo}` (run detail with unit statistics)
*   `POST /api/runs/{runNo}/authorize` (authorize or revoke run)
*   `POST /api/runs/{runNo}/mrb-decision` (record MRB decision for ON_HOLD run, M2)
*   `POST /api/runs/{runNo}/rework` (create rework run from ON_HOLD run, M2)
*   `GET /api/runs/{runNo}/rework-runs` (list rework runs for a parent run, M2)

### 2.11 OQC (Outgoing Quality Control)
*   `GET  /api/oqc` (list OQC inspections)
*   `GET  /api/oqc/{oqcId}` (OQC detail)
*   `GET  /api/oqc/run/{runNo}` (latest OQC for a run)
*   `GET  /api/oqc/run/{runNo}/gate` (check if run can be completed)
*   `POST /api/oqc/run/{runNo}` (create OQC task for run, M2)
*   `POST /api/oqc/{oqcId}/start` (start OQC)
*   `POST /api/oqc/{oqcId}/items` (record OQC items)
*   `POST /api/oqc/{oqcId}/complete` (complete OQC with PASS/FAIL)
*   `GET  /api/oqc/sampling-rules` (list sampling rules)
*   `GET  /api/oqc/sampling-rules/{ruleId}` (sampling rule detail)
*   `POST /api/oqc/sampling-rules` (create sampling rule)
*   `PATCH /api/oqc/sampling-rules/{ruleId}` (update sampling rule)
*   `DELETE /api/oqc/sampling-rules/{ruleId}` (deactivate sampling rule)

---

## 3. Minimal RBAC Suggestions

*   **Integration/Admin**: ERP ingestion.
*   **Engineer/Admin**: Native routing edit.
*   **Engineer**: Execution config edit.
*   **Production/Quality (Read)**: Querying route/version.
