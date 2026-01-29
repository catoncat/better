# Routing Engine Design & Configuration

> **更新时间**: 2026-01-28

This document defines the MES Routing Engine behavior and configuration model, aligned with:
- `domain_docs/mes/spec/process/01_end_to_end_flows.md` (E2E flowchart)
- `domain_docs/mes/spec/process/02_state_machines.md` (M1 simplified state machine)

The Routing Engine must support two sources of routing:
- **ERP Imported Routing** (source-of-truth): step sequence is read-only in MES (1A)
- **MES Native Routing**: editable in MES (preferred for SMT complex routes)

MES configures **execution semantics** for all routes via `RouteExecutionConfig` (2B).

Roles are distinct:
- `RoutingStep` defines the step sequence and identifiers only.
- `RouteExecutionConfig` defines how each step executes (stationType, gates, data specs, ingest mapping).

---

## 0. Non-negotiable Decisions (1A / 2B)

### 0.1 1A — ERP imported routing sequence is read-only
If `Routing.sourceSystem = ERP`:
- MES MUST NOT edit the step set or step order.
- Any changes to step sequence can only happen through ERP re-sync/import.

### 0.2 2B — ERP lacks station-level and runtime execution semantics; MES config is allowed
ERP typically provides:
- product/material association, effective range
- step ordering (e.g. 10/20/30)
- department/work center as reference

ERP typically does NOT provide (or is not suitable as):
- stationType (MANUAL/AUTO/BATCH/TEST)
- specific station or station-group constraints
- FAI/authorization gate requirements
- data collection bindings / ingest mapping rules
- runtime guard policies

MES provides these via **Route Execution Config** for all routes (see `03_route_execution_config.md`).

### 0.3 MES 自建路由（SMT）
当 ERP 无法维护复杂 SMT 路由时，MES 允许创建 `sourceSystem=MES` 的路由，步骤序列由 MES 管理并可编辑。
ERP 路由仍保留只读用于对照与同步，但 SMT 生产以 MES 路由为准。

---

## 1. Position in the Closed Loop (Aligned to the Flowchart)

Routing Engine participates in the production closed loop:
- Work Order received/released
- Run creation (PREP) and gatekeeping (ReadinessCheck / FAI / Authorization)
- Execution events (manual TrackIn/TrackOut, or ingest events)
- PASS advance, FAIL to quality loop
- Trace output

Routing Engine responsibilities:
- Decide whether a unit can execute at a given step/station
- Enforce gates (WO released, Run authorized, FAI passed, required data present)
- Create Track / DataValue / Quality triggers (minimal for M1)
- Advance the routing pointer on PASS, block on FAIL

Routing Engine non-responsibilities:
- Scheduling/APS optimization
- Cost accounting

---

## 2. Concepts and Runtime Model

### 2.1 Canonical Route
A canonical route is the **sequence** of steps:
- `Routing` + ordered `RoutingStep[]`
- `RoutingStep.stepNo` is the ordering key (not required to be contiguous)
- Steps reference `Operation`

Canonical route for ERP source is produced via ingestion (see `02_erp_route_ingestion.md`).

### 2.2 Execution Semantics (MES-owned)
Execution semantics are attached by MES and compiled into an executable snapshot:
- station type and event source
- allowed stations/station groups
- gate requirements: FAI / Authorization
- required data collection specs
- ingest mapping for AUTO/BATCH/TEST

Execution semantics are defined exclusively via `RouteExecutionConfig`, regardless of route source.

### 2.3 Executable Route Version (Compiled Snapshot)
The engine executes a **compiled snapshot**, not live mutable config:
- Snapshot is stored as `ExecutableRouteVersion.snapshotJson`
- Run binds one snapshot version at creation time (freeze)
- This guarantees stable execution and traceability even if ERP routing later updates

See `04_route_versioning_and_change_management.md`.

---

## 3. Step Ordering Rules (Critical)

### 3.1 stepNo is not index; do NOT assume +1
ERP commonly uses non-contiguous numbering (10/20/30...).
Therefore:
- To find the next step, the engine MUST sort stepNos and use the next item.
- The engine MUST NOT use `currentStepNo + 1`.

Algorithm:
- Let `S = sort(steps.stepNo ascending)`
- current stepNo is `S[i]`
- PASS advances to `S[i+1]` if present; else unit is done (M1: `DONE`)

---

## 4. Routing Selection (WorkOrder / Run)

### Current implementation (Phase 4)
At Run creation (or first execution), determine the routing and version.

Priority:
1) If `WorkOrder.meta.routingOverride` is present, use it.
2) Else if WorkOrder explicitly specifies `routingId`, use it.
3) Else match by `productCode` with MES route first, then ERP route:
   - `sourceSystem="MES"` + `productCode` (required)
   - `effectiveFrom <= now < effectiveTo` (null bounds treated as open)
   - `isActive = true`
4) If no MES match, then try ERP with the same filters.
5) If multiple match, resolve deterministically:
   - latest `effectiveFrom`
   - latest `updatedAt`
   - if still ambiguous, require explicit selection (manual bind).

Then select the latest READY `ExecutableRouteVersion` for that routing.
If no READY executable version exists, reject Run creation:
- `ROUTE_VERSION_NOT_READY` or `ROUTE_COMPILE_FAILED`

---

## 5. Run Freeze (Required)

When creating a Run:
- Select routing
- Select latest **READY** executable version
- Persist `Run.routeVersionId`
- Initialize units `currentStepNo` to the first stepNo in the snapshot

In-flight Runs MUST NOT auto-switch to a new route version after ERP updates.
Only new Runs use new versions.

### 5.1 工单手动覆盖与 ERP 同步
ERP 同步写入 WorkOrder 时：
- 若存在 `WorkOrder.meta.routingOverride`，则保留该路由绑定，不被 ERP 同步覆盖。
- 覆盖仅允许在未创建 Run 且工单未完成时执行（避免影响已冻结 Run 的 routeVersion）。

---

## 6. Guards (Gatekeeping at Execution Time)

Guards are enforced at Run authorization and TrackIn/TrackOut:

Run authorization (`POST /api/runs/:runNo/authorize`) guards:
- `RUN_NOT_READY` (Run must be `PREP`)
- `READINESS_CHECK_FAILED`
- `FAI_NOT_PASSED` (when any step requires FAI)

MANUAL TrackIn/TrackOut guards:
- `RUN_NOT_AUTHORIZED` (Run must be `AUTHORIZED` or `IN_PROGRESS`)
- `STEP_MISMATCH` (unit.currentStepNo is not found in the frozen snapshot)
- `STATION_MISMATCH` (station constraint mismatch)
- `REQUIRED_DATA_MISSING` (required data specs not satisfied)
- `UNIT_NOT_IN_STATION` (manual track-out without prior track-in)

Note: M1 simplified unit state machine only includes `QUEUED / IN_STATION / OUT_FAILED / DONE`.
M2 扩展引入 `ON_HOLD / SCRAPPED`；`REWORK` 为处置动作，不新增 UnitStatus。

---

## 7. StationType and Event Sources

Routing Engine supports the following execution modes:

- **MANUAL**: operator-driven TrackIn/TrackOut
- **AUTO**: equipment event ingest (may map to TrackIn/Out or combined)
- **BATCH**: carrier/lot based events (CarrierTrack; optionally create per-unit Tracks)
- **TEST**: test result ingest producing DataValues and PASS/FAIL outcome

stationType is determined by merged execution config:
- Step-level config > Operation-level config > Route-level config > Global defaults

See `03_route_execution_config.md`.

---

## 8. Quality and Data Collection Hook Points

### 8.1 Data collection binding
If a step binds `DataCollectionSpec[]`:
- TrackOut/ingest MUST validate required specs
- Produce DataValue records linked to Track/CarrierTrack
- If alarm policy indicates HOLD, then (M1) block with error; (M2+) enter ON_HOLD state

### 8.2 FAIL handling
On TrackOut(FAIL) in M1:
- unit transitions to `OUT_FAILED`
- no further advance
- defect/disposition/rework are M2+ (documented elsewhere)

---

## 9. Compile & Validate

### 9.1 When compile happens
- After ERP ingestion/update
- After MES native routing edits
- After execution config changes
- Can also be manually triggered for diagnosis

### 9.2 Minimal validation rules
Compilation MUST ensure:
- stepNos are sortable and unique per routing
- each step can resolve stationType
- AUTO/BATCH/TEST steps have ingestMapping
- required gates and data specs are syntactically valid and resolvable

Result:
- READY executable version when validation passes
- INVALID executable version with `errorsJson` when validation fails

---

## 11. UI Entry & Navigation Policy

To optimize user workflow, the `/mes` route implements permission-aware redirection:

1.  **Redirect Logic**:
    - If user has **Operator** permissions (e.g., `mes:execute`): Redirect to **Execution Dashboard** (`/mes/execution`).
    - If user has **Engineer/Admin** permissions (e.g., `mes:manage`): Redirect to **Readiness/Config Dashboard** (`/mes/readiness`).
    - Fallback: Stay at `/mes` landing page (if available) or 403.

2.  **Rationale**:
    - Operators primarily use the execution interface; avoiding an extra click improves efficiency.
    - Engineers primarily manage configuration and readiness.

## 12. References
- `02_erp_route_ingestion.md`
- `03_route_execution_config.md`
- `04_route_versioning_and_change_management.md`
- `05_route_mapping_tables.md`
- `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- `domain_docs/mes/spec/process/02_state_machines.md`
- `domain_docs/mes/spec/data_collection/01_data_collection_specs.md`
- `domain_docs/mes/spec/traceability/01_traceability_contract.md`
