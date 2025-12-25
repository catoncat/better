# Prisma Schema (SQLite) — Routing + ERP Integration Extensions

This document describes the Prisma schema approach for the MES project, with emphasis on routing integration:
- ERP imported routing raw storage
- Canonical routing tables
- MES execution semantics configuration
- Compiled executable route versions (for Run freeze)

Note: This is documentation. The source of truth is the actual `schema.prisma` in the codebase.
Implementation status: schema updates have started in `schema.prisma`; migrations are pending execution.

---

## 1. Existing Baseline (M1)

M1 baseline entities typically include:
- WorkOrder, Run, Unit
- Station / Line
- Track
- PrepCheck, Inspection, Authorization
- DataCollectionSpec, DataValue
- IntegrationMessage, AuditEvent
- TraceSnapshot (optional)

Routing exists as:
- Routing
- RoutingStep
- Operation

---

## 2. Required Extensions for ERP Routing Integration (1A/2B)

### 2.1 Extend `Routing` for source information
Add fields (or ensure equivalents exist):
- `sourceSystem`: enum (ERP | MES)
- `sourceKey`: external key for ERP (e.g., FNumber)
- `effectiveFrom` / `effectiveTo` (optional)
- `productCode` (match key)
- `isActive`

### 2.2 Stable step identity for config inheritance
`RoutingStep` should store:
- `stepNo` (ordering)
- `sourceStepKey` (stable external key, explicit column)
  - Example: `ERP:{routeNo}:{operNumber}:{processKey}`

This enables execution config inheritance across ERP updates.

### 2.3 ERP raw storage (recommended)
Store raw ingestion payloads for:
- audit / diff
- re-normalization reproducibility

Tables:
- `ErpRouteHeaderRaw`
- `ErpRouteLineRaw`

Also store sync cursors and dedupe keys:
- `IntegrationSyncCursor` (sourceSystem, entityType, lastSyncAt/lastSeq)
- `IntegrationMessage.entityType` and `IntegrationMessage.dedupeKey` for pull-based idempotency

TPM inbound storage:
- `TpmEquipment` (current status)
- `TpmStatusLog` (status history)
- `TpmMaintenanceTask` (maintenance state)

ERP master data storage:
- `Material`
- `BomItem`
- `WorkCenter`

### 2.4 Mapping tables
ERP process and work center should map into MES dictionaries:
- `OperationMapping` (ERP processKey → MES operationId)
- `WorkCenterStationGroupMapping` (ERP workCenter/department → MES stationGroupId)

### 2.5 MES execution semantics configuration (2B)
Execution semantics are MES-owned and must not mutate ERP step order:
- `RouteExecutionConfig`
  - supports scope: routing / operation / step / sourceStepKey
  - stores stationType, station constraints, gate flags, dataSpec bindings, ingestMapping

RoutingStep stores the step sequence and identifiers only; execution semantics are defined via `RouteExecutionConfig`.

### 2.6 Compiled executable route versions
Add:
- `ExecutableRouteVersion`
  - contains `snapshotJson` and optional `errorsJson`
  - status READY/INVALID
- Add `Run.routeVersionId` foreign key to freeze version at Run creation

---

## 3. Indexing & Constraints (Minimum Set)

Recommended:
- `Routing(code)` unique
- `Routing(sourceSystem, sourceKey)` index
- `RoutingStep(routingId, stepNo)` unique
- `RoutingStep(sourceStepKey)` index
- `ExecutableRouteVersion(routingId, versionNo)` unique
- `Run(routeVersionId)` index
- Mapping tables unique constraints on `(sourceSystem, sourceKey)`

---

## 4. Migration Notes (Behavioral)

- `Unit.currentStepNo` must represent `RoutingStep.stepNo` (not array index)
- Advance logic must be based on sorting the step list (see routing engine doc)
- Run creation must write `routeVersionId` to guarantee stable behavior

---

## 5. Related Docs
- `domain_docs/mes/spec/routing/02_erp_route_ingestion.md`
- `domain_docs/mes/spec/routing/03_route_execution_config.md`
- `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
- `domain_docs/mes/spec/traceability/01_traceability_contract.md`
