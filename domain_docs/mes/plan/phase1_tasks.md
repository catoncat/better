# Implementation Plan: Phase 1 (M1 - Production Execution Closed Loop)

This document outlines the detailed task breakdown for Phase 1 of the MES implementation.
Goal: Complete the basic production loop, from work order reception to unit completion.

## Task 1.1: Database Schema Migration
*   **Goal**: Apply MES domain models to the database.
*   **Input**: `domain_docs/mes/tech/db/01_prisma_schema.md`
*   **Actions**:
    1.  Merge MES Prisma Models (WorkOrder, Run, Unit, Track, etc.) into `packages/db/prisma/schema/schema.prisma`.
    2.  Run `bun prisma migrate dev --name init_mes_schema`.
    3.  Run `bun prisma generate`.
*   **Definition of Done**: DB contains all MES tables; build succeeds.
*   **Status**: [x] Done (2025-12-23)

## Task 1.2: Backend Module Setup
*   **Goal**: Establish server-side structure following `api_patterns.md`.
*   **Input**: `agent_docs/03_backend/api_patterns.md`
*   **Actions**:
    1.  Create `apps/server/src/modules/mes/`.
    2.  Create sub-modules: `work-order`, `run`, `station`, `execution`.
    3.  Register MES root routes in `apps/server/src/index.ts`.
*   **Definition of Done**: MES health check endpoint accessible; clean structure.
*   **Status**: [x] Done (2025-12-23)

## Task 1.3: Master Data Seeding
*   **Goal**: Pre-populate static data required for testing.
*   **Actions**:
    1.  Write Seed script for:
        *   **Lines/Stations**: Define basic lines and manual stations.
        *   **Operation/Routing**: Define a standard PCBA routing (e.g., Print -> SPI -> Mount -> Reflow -> AOI).
*   **Definition of Done**: Routing and Station data exists in DB.
*   **Status**: [x] Done (2025-12-23)

## Task 1.4: Work Order & Run APIs
*   **Goal**: Enable creating work orders and production runs.
*   **Input**: `domain_docs/mes/tech/api/02_api_contracts_execution.md` (Sections 1 & 2)
*   **Actions**:
    1.  Implement `POST /api/integration/work-orders`.
    2.  Implement `POST /api/work-orders/{woNo}/release`.
    3.  Implement `POST /api/work-orders/{woNo}/runs`.
    4.  Implement simplified `POST /api/runs/{runNo}/authorize` (bypass complex FAI for M1).
*   **Definition of Done**: Can create an `AUTHORIZED` Run via API.
*   **Status**: [x] Done (2025-12-23)

## Task 1.5: Tracking APIs (Core Routing)
*   **Goal**: Implement unit flow logic (Routing Engine).
*   **Input**: `domain_docs/mes/tech/api/02_api_contracts_execution.md` (Section 3) & `domain_docs/mes/spec/routing/01_routing_engine.md`
*   **Actions**:
    1.  Implement `POST /api/stations/{stationCode}/track-in`.
        *   Logic: Validate Run status, Step match; set Unit to `IN_STATION`.
    2.  Implement `POST /api/stations/{stationCode}/track-out`.
        *   Logic: Record Result/Data; Advance `currentStepNo` or finish.
*   **Definition of Done**: Unit can move from first to last step via API; status updates correctly.
*   **Status**: [x] Done (2025-12-23)

## Task 1.6: End-to-End Verification
*   **Goal**: Verify the closed loop.
*   **Input**: `domain_docs/mes/tests/01_acceptance_scenarios.md`
*   **Actions**:
    1.  Create an integration test script.
    2.  Execute full flow: Receive WO -> Release -> Create Run -> Authorize -> TrackIn/Out (Step 1...N).
    3.  Verify final state via simple trace query.
*   **Definition of Done**: All steps pass; data consistency verified.
*   **Status**: [x] Done (2025-12-23)

## Task 1.7: MES Query/List APIs (Support UI)
*   **Goal**: Provide list endpoints required for the M1 UI.
*   **Input**: `agent_docs/03_backend/api_patterns.md`, `domain_docs/mes/tech/api/01_api_overview.md`
*   **Actions**:
    1.  Implement `GET /api/work-orders` with pagination, search, status filter, sort.
    2.  Implement `GET /api/runs` with pagination, search, status filter, sort, and work order filter.
    3.  Implement `GET /api/stations` returning basic station + line info for selection.
*   **Definition of Done**: UI can load Work Orders, Runs, and Stations without mock data.
*   **Status**: [x] Done (2025-12-23)

## Task 1.8: M1 UI Delivery
*   **Goal**: Deliver minimal MES UI for M1.
*   **Input**: `domain_docs/mes/plan/phase1_ui_tasks.md`
*   **Actions**:
    1.  Complete UI tasks in `phase1_ui_tasks.md`.
    2.  Validate UI flow against M1 acceptance scenarios.
*   **Definition of Done**: Operators can complete the M1 loop via UI.
*   **Status**: [x] Done (2025-12-23)

---

# ERP Routing Integration Addendum (M1.5)

## Task 1.9: ERP Routing Schema Extensions
*   **Goal**: Extend schema for ERP routing ingestion, mapping, and versioning.
*   **Input**: `domain_docs/mes/tech/db/01_prisma_schema.md`
*   **Actions**:
    1.  Add routing source fields and `sourceStepKey` to `Routing` / `RoutingStep`.
    2.  Add raw ERP tables (`ErpRouteHeaderRaw`, `ErpRouteLineRaw`).
    3.  Add mapping tables (`OperationMapping`, `WorkCenterStationGroupMapping`).
    4.  Add `RouteExecutionConfig` and `ExecutableRouteVersion` models.
    5.  Add `Run.routeVersionId` and required indexes.
*   **Definition of Done**: Schema supports ERP routing + version freeze.
*   **Status**: [x] Done (2025-12-25)

## Task 1.10: ERP Routing Ingestion
*   **Goal**: Import ERP routing and normalize to canonical routes.
*   **Input**: `domain_docs/mes/spec/routing/02_erp_route_ingestion.md`, `agent_docs/03_backend/api_patterns.md`
*   **Actions**:
    1.  Implement pull-based sync for `ENG_Route` with pagination and cursor.
    2.  Persist raw ERP payloads.
    3.  Normalize to `Routing` + `RoutingStep` with `sourceStepKey`.
    4.  Create or update mappings; record missing mappings as errors.
*   **Definition of Done**: ERP import produces canonical routes without duplicating steps.
*   **Status**: [x] Done (2025-12-25)

## Task 1.10.1: Kingdee ERP Adapter (Pull)
*   **Goal**: Implement Kingdee API client for pull-based sync.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Implement LoginByAppSecret and cookie reuse.
    2.  Implement ExecuteBillQuery with pagination and filter.
    3.  Normalize response into integration payloads.
*   **Definition of Done**: Adapter can pull `ENG_Route` and return normalized payloads.
*   **Status**: [x] Done (2025-12-25)

## Task 1.11: Execution Config & Compile
*   **Goal**: Configure execution semantics and compile executable versions.
*   **Input**: `domain_docs/mes/spec/routing/03_route_execution_config.md`, `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
*   **Actions**:
    1.  Implement execution config CRUD endpoints.
    2.  Build compile service to generate `ExecutableRouteVersion.snapshotJson`.
    3.  Enforce compile validation rules (stationType, ingestMapping, dataSpec bindings).
*   **Definition of Done**: Valid configs compile to READY versions; invalid configs produce INVALID with errors.
*   **Status**: [x] Done (2025-12-25)

## Task 1.12: Run Freeze & Execution Guards
*   **Goal**: Use frozen executable versions during execution.
*   **Input**: `domain_docs/mes/spec/routing/01_routing_engine.md`, `domain_docs/mes/tech/api/02_api_contracts_execution.md`
*   **Actions**:
    1.  Update run creation to select latest READY version and persist `routeVersionId`.
    2.  Use snapshot step list for step ordering and guard checks.
    3.  Ensure step advance uses sorted `stepNo` (not +1).
*   **Definition of Done**: Runs execute against frozen snapshots; ERP updates do not affect in-flight runs.
*   **Status**: [x] Done (2025-12-25)

## Task 1.13: Trace & Acceptance Tests
*   **Goal**: Ensure trace reflects frozen route versions and ERP integration behavior.
*   **Input**: `domain_docs/mes/spec/traceability/01_traceability_contract.md`, `domain_docs/mes/tests/02_routing_integration_scenarios.md`
*   **Actions**:
    1.  Update trace API output to include `route`, `routeVersion`, and snapshot steps.
    2.  Add acceptance tests for ERP import idempotency, versioning, and run freeze.
*   **Definition of Done**: Trace reflects frozen version; tests cover ERP routing scenarios.
*   **Status**: [x] Done (2025-12-25)

## Task 1.14: TPM Sync & Execution Gates
*   **Goal**: Use TPM equipment status and maintenance data as execution gates.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Pull equipment master data; map `Equipment.code` to `Station.code`.
    2.  Pull `MachineStatusLog` and expose station availability.
    3.  Block TrackIn when equipment status is not `normal`.
    4.  (Optional) Block TrackIn when maintenance/repair is in progress.
*   **Definition of Done**: Execution honors TPM status gates; station availability reflects TPM.
*   **Status**: [x] Done (2025-12-25)

## Task 1.15: Integration Mock Module
*   **Goal**: Provide mock payloads for ERP/TPM pull endpoints.
*   **Input**: `domain_docs/mes/spec/integration/02_integration_payloads.md`
*   **Actions**:
    1.  Add mock routes for ERP routing/work orders/materials/BOM/work centers.
    2.  Add mock routes for TPM equipment/status/maintenance tasks.
    3.  Ensure responses follow envelope and cursor contract.
*   **Definition of Done**: Mock endpoints return payloads compatible with integration contracts.
*   **Status**: [x] Done (2025-12-25)

---

# Integration Foundation Addendum (M1.6)

## Task 1.16: Integration Sync State & Dedupe
*   **Goal**: Make inbound sync deterministic and replayable.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`, `domain_docs/mes/tech/db/01_prisma_schema.md`
*   **Actions**:
    1.  Add or verify `IntegrationSyncCursor` for `(sourceSystem, entityType)`.
    2.  Persist `IntegrationMessage` for every pull batch (raw payload + dedupeKey).
    3.  Enforce idempotency by `dedupeKey` and return existing results on replays.
    4.  Schema additions applied in `schema.prisma` (2025-12-25).
*   **Definition of Done**: Re-running the same pull does not create duplicates; cursor advances deterministically.
*   **Status**: [x] Done (2025-12-25)

## Task 1.17: ERP Master Data Schema & Normalization
*   **Goal**: Support ERP materials/BOM/work centers for routing and traceability.
*   **Input**: `domain_docs/mes/spec/integration/02_integration_payloads.md`
*   **Actions**:
    1.  Add canonical tables for Material/BOM/WorkCenter (or confirm existing schema).
    2.  Implement normalization from ERP payloads into canonical tables.
    3.  Add mapping hooks to `WorkCenterStationGroupMapping`.
*   **Definition of Done**: ERP master data can be stored and queried in MES.
*   **Status**: [x] Done (2025-12-25)

## Task 1.18: ERP Master Data Pull (Work Orders / Materials / BOM / Work Centers)
*   **Goal**: Pull ERP master data via API with cursor-based sync.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Implement pull adapters for work orders, materials, BOM, work centers using the existing Kingdee adapter.
    2.  Use `IntegrationSyncCursor` for incremental sync.
    3.  Persist raw payloads and normalize into canonical tables.
*   **Definition of Done**: Master data sync produces canonical entities without duplicates.
*   **Status**: [x] Done (2025-12-25)

## Task 1.19: TPM Adapter & Sync
*   **Goal**: Pull TPM equipment, status, and maintenance data.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Implement TPM pull adapters for equipment, status logs, maintenance tasks (and calibration if available).
    2.  Normalize into MES station status cache and maintenance state.
    3.  Enforce execution gates from TPM status/maintenance.
*   **Definition of Done**: TrackIn is blocked when TPM indicates unavailable or in-maintenance.
*   **Status**: [x] Done (2025-12-26)

## Task 1.20: Integration Scheduler & Ops
*   **Goal**: Operate sync jobs reliably.
*   **Input**: `agent_docs/05_ops/cron_jobs.md`
*   **Actions**:
    1.  Expand cron triggers for each entity type with configurable patterns.
    2.  Add manual sync endpoints for each entity type.
    3.  Log job outcomes with audit/metrics hooks.
*   **Definition of Done**: All inbound integrations can be triggered manually or by cron with clear observability.
*   **Status**: [x] Done (2025-12-26)

---

# Experience & Demo Addendum (M1.7)

## Task 1.21: Experience Seed & Defaults
*   **Goal**: Provide a zero-friction demo environment after `db:seed`.
*   **Input**: `agent_docs/00_onboarding/setup.md`
*   **Actions**:
    1.  Run MES master-data seed during `bun run db:seed` (lines, stations, routing).
    2.  Ensure a READY executable route version exists for the sample routing.
*   **Definition of Done**: A fresh database can create runs without extra manual compile/seed steps.
*   **Status**: [x] Done (2025-12-26)

## Task 1.22: One-Command Demo Flow
*   **Goal**: Make the end-to-end MES flow runnable in one script.
*   **Input**: `apps/server/scripts/test-mes-flow.ts`
*   **Actions**:
    1.  Auto-compile the routing if no READY version exists.
    2.  Document the command in onboarding (quick demo section).
*   **Definition of Done**: Running the script completes without extra manual steps.
*   **Status**: [x] Done (2025-12-26)

## Task 1.23: Route Version UX
*   **Goal**: Remove API-only route compilation from the demo path.
*   **Input**: `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
*   **Actions**:
    1.  Add a minimal UI view to list versions and compile the route.
    2.  Show READY/INVALID status and compile errors.
*   **Definition of Done**: A user can compile and verify route versions via UI.
*   **Status**: [x] Done (2025-12-26)

## Task 1.24: Integration Sync UX
*   **Goal**: Expose manual integration sync from the UI for demos.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Add a minimal admin page to trigger ERP/TPM sync jobs.
    2.  Display last sync cursor and outcome (from `IntegrationSyncCursor` / `SystemLog`).
*   **Definition of Done**: A user can trigger inbound syncs and see status in the UI.
*   **Status**: [x] Done (2025-12-26)

## Task 1.25: Routing Management UI
*   **Goal**: Make routing definitions viewable in the UI.
*   **Input**: `domain_docs/mes/spec/routing/01_routing_engine.md`
*   **Actions**:
    1.  Add routing list page with search and source filters.
    2.  Add routing detail page showing steps and metadata.
*   **Definition of Done**: Users can view routing details and step lists in the UI.
*   **Status**: [x] Done (2025-12-26)

## Task 1.26: Execution Config Editing UX
*   **Goal**: Allow editing execution semantics in the UI.
*   **Input**: `domain_docs/mes/spec/routing/03_route_execution_config.md`
*   **Actions**:
    1.  Add execution config list with create/edit dialogs.
    2.  Support station group, allowed station, FAI, authorization, data spec, and mapping fields.
*   **Definition of Done**: Execution configs can be created/updated without raw ID entry.
*   **Status**: [x] Done (2025-12-26)
