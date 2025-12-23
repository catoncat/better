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
*   **Input**: `domain_docs/mes/tech/api/02_api_contracts_execution.md` (Section 3) & `spec/routing/01_routing_engine.md`
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
