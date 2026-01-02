# ERP Route Ingestion (Import / Normalize / Compile)

> **更新时间**: 2025-01-02
> **实现状态**: ✅ M1.5 已完成，Kingdee ENG_Route 同步可用

This document defines how MES ingests ERP routing definitions and turns them into canonical routing + compiled executable versions.

Key principle:
- **ERP is the source of truth for step sequence** (1A)
- **MES owns execution semantics** (2B)

---

## 1. Input Shape (Typical ERP Export)

ERP routing export often contains:
- Header fields: route number/key, material/product, org, effective dates, batch ranges
- Line fields: operNumber (stepNo), processKey/name, workCenter/department, control code, activity/resource/work time

Note: ERP exports sometimes use “header-only-on-first-row”; ingestion must forward-fill header context.

### 1.1 Kingdee ENG_Route (Reference)
Source:
- FormId: `ENG_Route` via `ExecuteBillQuery`
- Pagination: `StartRow` + `Limit`

Header fields:
- `FID(ENG_Route)` (internal id)
- `FNumber` (route code)
- `FName` (route name)
- `FMATERIALID` (product code)
- `FUseOrgId` / `FCreateOrgId`
- `FEFFECTDATE` / `FExpireDate`
- `FRouteSrc`
- `FBomId`
- `FModifyDate`

Step fields:
- `FOperNumber` (stepNo)
- `FProcessId` / `FProcessId#Name` (operation)
- `FWorkCenterId` / `FWorkCenterId#Name` (work center)
- `FDepartmentId` / `FDepartmentId#Name` (department)
- `FOperDescription`
- `FKeyOper`
- `FIsFirstPieceInspect`
- `FIsProcessRecordStation` / `FIsQualityInspectStation`

Verified in current Kingdee environment:
- These step fields are directly queryable via ExecuteBillQuery (no `TreeEntity` prefix required).
- View API may show `RouteOperSeq` structures; treat them as structural hints only.

Parsing rule:
- When `FNumber` is empty, reuse the last seen header fields for that row.

---

## 2. Storage Layers

### 2.1 Raw storage (audit-grade)
Persist raw data for:
- audit, diff, replay
- troubleshooting mapping/normalize issues

Recommended tables:
- `ErpRouteHeaderRaw`
- `ErpRouteLineRaw`

### 2.2 Canonical normalized route (MES canonical)
Create/update:
- `Routing(sourceSystem=ERP, sourceKey=<erp route no>, code=<same>)`
- `RoutingStep(stepNo=operNumber, operationId=<mapped>, sourceStepKey=<stable key>)`

`sourceStepKey` is stored as an explicit column on `RoutingStep` to enable stable matching and indexing.

**No step reordering** is allowed in MES for ERP source.

---

## 3. Idempotency and Diff

### 3.1 Idempotency key
Suggested dedupe key:
- `sourceKey` (ERP route number)
- `FModifyDate` (if present)
- ERP headId (if present)
- fallback to payload hash when no reliable modify timestamp exists

### 3.2 Diff rules (when to create a new executable version)
A new compile/version should be triggered when canonical step content changes, e.g.:
- step added/removed
- stepNo changed
- processKey changed (operation changes)

Non-step metadata changes (e.g., descriptions) may be recorded but do not create a new version.
Execution config changes can still trigger new executable versions (see `04_route_versioning_and_change_management.md`).

---

## 4. Mapping Requirements (See also 05_route_mapping_tables.md)

### 4.1 ERP processKey → MES Operation
Resolve via `OperationMapping`.
Missing mapping policy options:
- Option A (recommended for early phase): auto-create Operation (audit can be recorded at the integration sync level)
- Option B (strict): mark compile INVALID until mapping is provided

### 4.2 workCenter/department handling
ERP workCenter/dept is informative:
- store in `RoutingStep.meta.erp`
- optionally suggest a stationGroup via `WorkCenterStationGroupMapping`

This must not be interpreted as “final station assignment”.

---

## 5. Post-Ingest Compile

After canonical route is updated:
1) Compile to `ExecutableRouteVersion`
2) Validate executability using merged execution config
3) Result:
- READY version if all requirements are satisfied
- INVALID version with detailed errors if not

If compile is INVALID:
- older READY versions remain available for new Run selection
- release/run creation should refuse if there is no READY version at all

---

## 6. Failure Strategy

- Raw import fails: record `IntegrationMessage(status=FAILED)`
- Normalize fails: do not corrupt canonical route; record AuditEvent
- Compile fails: create INVALID version but keep previous READY versions

---

## 7. Suggested Endpoints

- `POST /api/integration/erp/routes/import`
- `POST /api/integration/erp/routes/sync` (pull trigger)
- `GET  /api/routes/{routingCode}/source`
