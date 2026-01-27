# MES API Overview

Aligned with `agent_docs/03_backend/api_patterns.md` (envelope + error format + audit rules).

## 1. API Domains

### 1.1 Integration

- `GET /api/integration/status`
- `POST /api/integration/erp/routes/sync`
- `POST /api/integration/erp/work-orders/sync`
- `POST /api/integration/erp/materials/sync`
- `POST /api/integration/erp/boms/sync`
- `POST /api/integration/erp/work-centers/sync`
- `POST /api/integration/tpm/equipment/sync`
- `POST /api/integration/tpm/status-logs/sync`
- `POST /api/integration/tpm/maintenance-tasks/sync`
- `POST /api/integration/work-orders` (receive push)
- `POST /api/integration/stencil-status`
- `POST /api/integration/solder-paste-status`
- `GET /api/integration/device-data`
- `POST /api/integration/device-data`
- `POST /api/integration/lines/:lineId/stencil/bind`
- `POST /api/integration/lines/:lineId/stencil/unbind`
- `POST /api/integration/lines/:lineId/solder-paste/bind`
- `POST /api/integration/lines/:lineId/solder-paste/unbind`
- `POST /api/integration/outbound/erp/runs/:runNo/completion`
- `GET /api/integration/outbound/events`
- `POST /api/integration/outbound/events/:eventId/retry`

### 1.2 Routing (Read + Execution Config + Compile)

- `GET /api/routes`
- `GET /api/routes/:routingCode`
- `GET /api/routes/:routingCode/execution-config`
- `POST /api/routes/:routingCode/execution-config`
- `PATCH /api/routes/:routingCode/execution-config/:configId`
- `POST /api/routes/:routingCode/compile`
- `GET /api/routes/:routingCode/versions`
- `GET /api/routes/:routingCode/versions/:versionNo`

### 1.3 Work Orders / Runs

- `GET /api/work-orders`
- `POST /api/work-orders/:woNo/release`
- `POST /api/work-orders/:woNo/runs`
- `GET /api/runs`
- `GET /api/runs/:runNo`
- `POST /api/runs/:runNo/authorize`
- `POST /api/runs/:runNo/mrb-decision`
- `POST /api/runs/:runNo/rework`
- `GET /api/runs/:runNo/rework-runs`

### 1.4 Readiness

- `POST /api/runs/:runNo/readiness/precheck`
- `POST /api/runs/:runNo/readiness/check`
- `GET /api/runs/:runNo/readiness/latest`
- `GET /api/runs/:runNo/readiness/history`
- `POST /api/runs/:runNo/readiness/items/:itemId/waive`
- `GET /api/readiness/exceptions`
- `GET /api/lines/:lineId/readiness-config`
- `PUT /api/lines/:lineId/readiness-config`

### 1.5 Loading (Execution + Config)

- `POST /api/runs/:runNo/loading/load-table`
- `GET /api/runs/:runNo/loading`
- `GET /api/runs/:runNo/loading/expectations`
- `POST /api/loading/verify`
- `POST /api/loading/replace`
- `GET /api/lines/:lineId/feeder-slots`
- `POST /api/lines/:lineId/feeder-slots`
- `PUT /api/lines/:lineId/feeder-slots/:slotId`
- `DELETE /api/lines/:lineId/feeder-slots/:slotId`
- `POST /api/feeder-slots/:slotId/unlock`
- `GET /api/slot-mappings`
- `POST /api/slot-mappings`
- `PUT /api/slot-mappings/:id`
- `DELETE /api/slot-mappings/:id`

### 1.6 Stations / Execution

- `GET /api/stations`
- `GET /api/stations/groups`
- `GET /api/stations/:stationCode/queue`
- `POST /api/stations/:stationCode/track-in`
- `POST /api/stations/:stationCode/track-out`

### 1.7 Quality (FAI / FQC / OQC)

- `GET /api/fai`
- `GET /api/fai/:faiId`
- `GET /api/fai/run/:runNo`
- `GET /api/fai/run/:runNo/gate`
- `POST /api/fai/run/:runNo`
- `POST /api/fai/:faiId/start`
- `POST /api/fai/:faiId/items`
- `POST /api/fai/:faiId/complete`
- `POST /api/fai/:faiId/sign`

- `GET /api/fqc`
- `GET /api/fqc/:fqcId`
- `GET /api/fqc/run/:runNo`
- `POST /api/fqc/run/:runNo`
- `POST /api/fqc/:fqcId/start`
- `POST /api/fqc/:fqcId/items`
- `POST /api/fqc/:fqcId/complete`
- `POST /api/fqc/:fqcId/sign`

- `GET /api/oqc`
- `GET /api/oqc/:oqcId`
- `GET /api/oqc/run/:runNo`
- `GET /api/oqc/run/:runNo/gate`
- `POST /api/oqc/run/:runNo`
- `POST /api/oqc/:oqcId/start`
- `POST /api/oqc/:oqcId/items`
- `POST /api/oqc/:oqcId/complete`
- `GET /api/oqc/sampling-rules`
- `GET /api/oqc/sampling-rules/:ruleId`
- `POST /api/oqc/sampling-rules`
- `PATCH /api/oqc/sampling-rules/:ruleId`
- `DELETE /api/oqc/sampling-rules/:ruleId`

### 1.8 Quality (Defects / Rework Tasks)

- `GET /api/defects`
- `POST /api/defects`
- `POST /api/defects/:defectId/disposition`
- `POST /api/defects/:defectId/release`
- `GET /api/rework-tasks`
- `POST /api/rework-tasks/:taskId/complete`

### 1.9 Traceability

- `GET /api/trace/units/:sn`

---

## 2. MES Error Codes (Non-exhaustive)

- `WORK_ORDER_NOT_RECEIVED`, `WORK_ORDER_NOT_RELEASED`, `WORK_ORDER_MATERIAL_NOT_READY`
- `WORK_ORDER_DISPATCH_LINE_MISMATCH`
- `RUN_NOT_FOUND`, `RUN_NOT_READY`, `RUN_NOT_AUTHORIZED`, `RUN_NOT_ON_HOLD`
- `RUN_LINE_INCOMPATIBLE_WITH_ROUTE`
- `LINE_NOT_FOUND`, `STATION_GROUP_NOT_FOUND`
- `READINESS_CHECK_FAILED`
- `FAI_NOT_PASSED`, `FAI_ALREADY_EXISTS`
- `FQC_NOT_READY`, `FQC_ALREADY_EXISTS`
- `STEP_MISMATCH`, `STATION_MISMATCH`, `STATION_LINE_MISMATCH`, `REQUIRED_DATA_MISSING`, `UNIT_NOT_IN_STATION`
- `TPM_EQUIPMENT_UNAVAILABLE`, `TPM_MAINTENANCE_IN_PROGRESS`
- `OQC_NOT_READY`, `UNIT_NOT_IN_SAMPLE`
- `MRB_DECISION_REQUIRED`, `INVALID_MRB_DECISION`, `NO_FAILED_OQC`, `REWORK_TYPE_REQUIRED`
- `FAI_WAIVER_REASON_REQUIRED`, `FAI_WAIVER_NOT_ALLOWED`

---

## 3. Minimal RBAC Suggestions

- Integration: `SYSTEM_INTEGRATION`
- Routing: `ROUTE_READ`, `ROUTE_CONFIGURE`, `ROUTE_COMPILE`
- Production: `WO_RELEASE`, `RUN_CREATE`, `EXEC_TRACK_IN`, `EXEC_TRACK_OUT`, `EXEC_READ`
- Quality: `QUALITY_FAI`, `QUALITY_OQC`, `QUALITY_DISPOSITION`
