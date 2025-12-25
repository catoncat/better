# System Integrations (ERP / TPM)

This document defines the integration scope and data flow patterns for MES.
It covers ERP/APS and TPM (equipment management). Additional systems can extend this model.
See `domain_docs/mes/spec/integration/02_integration_payloads.md` for payload contracts.

---

## 1. Scope Overview

Integrations are grouped by direction:
- **Inbound (to MES)**: master data, routing, and operational events needed for execution.
- **Outbound (from MES)**: production results, quality outcomes, and traceability summaries.

---

## 2. ERP / APS Integration

### 2.1 Inbound (ERP → MES)
- Work orders / plans (WO/APS)
- Product & BOM master data (for material traceability)
- Routing & operation master data (step sequence source-of-truth)
- Work center / department (used for mapping to station groups)

### 2.2 Outbound (MES → ERP)
- Production completion (good quantity, scrap)
- Material consumption & key-part traceability
- Quality results (defects, disposition, rework)
- WIP progress (optional)

### 2.3 ERP Routing Sync (Kingdee ENG_Route)
Source:
- FormId: `ENG_Route` via `ExecuteBillQuery`
- Pagination: `StartRow` + `Limit`

Incremental strategy:
- Use `FModifyDate` if available for `>= lastSyncAt`
- If `FModifyDate` is not reliable, fallback to full pull + local diff

Header fields (route identity):
- `FBillHead(ENG_Route)` (internal id)
- `FNumber` (route code)
- `FName` (route name)
- `FMATERIALID` (product code)
- `FUseOrgId` / `FCreateOrgId`
- `FEFFECTDATE` / `FExpireDate`
- `FRouteSrc`
- `FBomId`
- `FModifyDate`

Step fields (operation line):
- `FOperNumber` (stepNo)
- `FProcessId` / `FProcessId#Name` (operation)
- `FWorkCenterId` / `FWorkCenterId#Name` (work center)
- `FDepartmentId` / `FDepartmentId#Name` (department)
- `FOperDescription`
- `FKeyOper` (key operation)
- `FIsFirstPieceInspect`
- `FIsProcessRecordStation` / `FIsQualityInspectStation`

Parsing notes:
- Export rows may include header data only on the first row for a route; subsequent rows carry step data with empty header columns.
- The importer must carry forward the last seen header row when `FNumber` is empty.

Normalization:
- `Routing` from header fields
- `RoutingStep` from step fields
- `sourceStepKey = ERP:{FNumber}:{FOperNumber}:{FProcessId}`
- Store unmapped fields in `RoutingStep.meta.erp`

Dedupe:
- `dedupeKey = ERP:ROUTE:{FNumber}:{FModifyDate}` if `FModifyDate` exists
- Else `dedupeKey = ERP:ROUTE:{FNumber}:{payloadHash}`

### 2.4 Kingdee API Adapter (Pull)
Authentication:
- Endpoint: `Kingdee.BOS.WebApi.ServicesStub.AuthService.LoginByAppSecret.common.kdsvc`
- Inputs: `DBID`, `USERNAME`, `APPID`, `APP_SECRET`, `LCID`
- Session: store cookies from login response and reuse for queries

Query:
- Endpoint: `Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery.common.kdsvc`
- Payload fields:
  - `FormId`, `FieldKeys`, `FilterString`, `StartRow`, `Limit`
- Filter strategy:
  - Prefer `FModifyDate >= lastSyncAt`
  - Fallback to full pull + local diff if no reliable modify timestamp

Configuration (env vars, prefix `MES_ERP_KINGDEE_`):
- `BASE_URL`
- `DBID`
- `USERNAME`
- `APPID`
- `APP_SECRET`
- `LCID`
- `CRON_ENABLED` (optional, `true` to enable)
- `CRON_PATTERN` (optional, default `0 */2 * * *`)

---

## 3. TPM Integration (Equipment Management)

### 3.1 Inbound (TPM → MES)
- Equipment master data (station/equipment identifiers, capabilities)
- Equipment status / availability (used in prep checks and execution gates)
- Maintenance / repair state (optional gate for execution)
- Calibration state for instruments (optional gate for test stations)

Mapping rule:
- `Equipment.code` MUST match `Station.code` for direct association.

### 3.2 Outbound (MES → TPM)
- Production usage metrics (runtime, cycle count)
- Quality outcomes tied to equipment (optional)

---

## 4. Sync Modes & Recommended Design

### 4.1 Pull-first, push optional
- **Pull**: MES calls source APIs by timestamp/sequence.
- **Push**: optional if the source later supports webhooks.

Manual trigger:
- `POST /api/integration/erp/routes/sync` (pull ENG_Route)

### 4.2 Ingestion pipeline (recommended)
1) **Pull & validate** (sourceKey + dedupeKey)
2) **Raw persistence** (IntegrationMessage + raw tables)
3) **Normalize** into canonical tables
4) **Compile** executable route versions (for routing updates)
5) **Publish** READY versions; in-flight Runs remain unchanged

### 4.3 Error handling & replay
- Parse errors: record failure and preserve raw payload for replay
- Mapping gaps: produce INVALID version and output missing keys
- Dedupe collisions: return existing result without duplication

---

## 5. Ownership & Source of Truth

- **Routing step sequence**: ERP is source-of-truth.
- **Execution semantics**: MES owns `RouteExecutionConfig`.
- **Equipment status/maintenance**: TPM is source-of-truth.
