# Implementation Plan: Phase 1 UI (M1 - Production Execution Closed Loop)

This document outlines the UI task breakdown for Phase 1 of the MES implementation.
Goal: Provide a minimal operator UI for the basic production loop.

**Last Updated**: 2025-12-27

## Task UI-1: MES Frontend Routes & Layout
*   **Goal**: Create MES UI routes and base layout.
*   **Input**: `agent_docs/02_frontend/ui_system.md`, `agent_docs/02_frontend/routing_tanstack.md`
*   **Actions**:
    1.  Add `/mes` route group and top-level navigation entry.
    2.  Create placeholder pages for Work Orders, Runs, Station Execution.
*   **Definition of Done**: Pages render and are reachable from the app navigation.
*   **Status**: [x] Done (2025-12-23)

## Task UI-2: Work Orders Page
*   **Goal**: Manage Work Orders from the UI.
*   **Input**: `agent_docs/02_frontend/data_list_pattern.md`, `agent_docs/02_frontend/create_edit_dialog.md`
*   **Actions**:
    1.  List Work Orders with basic fields and status.
    2.  Add "Receive Work Order" dialog with Combobox routing selection.
    3.  Add "Release Work Order" action calling `POST /api/work-orders/{woNo}/release`.
*   **Definition of Done**: Users can create and release work orders via UI; list updates.
*   **Status**: [x] Done (2025-12-23, routing Combobox added 2025-12-26)

## Task UI-3: Runs Page
*   **Goal**: Create and authorize Runs.
*   **Input**: `agent_docs/02_frontend/data_list_pattern.md`, `agent_docs/02_frontend/create_edit_dialog.md`
*   **Actions**:
    1.  List Runs with status, line, and work order reference.
    2.  Add "Create Run" dialog calling `POST /api/work-orders/{woNo}/runs`.
    3.  Add "Authorize Run" action calling `POST /api/runs/{runNo}/authorize`.
*   **Definition of Done**: Users can create and authorize runs via UI; list updates.
*   **Status**: [x] Done (2025-12-23)

## Task UI-4: Station Execution Page
*   **Goal**: Support manual Track In/Out from the UI with queue visibility.
*   **Input**: `agent_docs/02_frontend/ui_system.md`
*   **Actions**:
    1.  Provide station selector or input for `stationCode`.
    2.  Display station queue with in-station units (auto-refresh every 10s).
    3.  Track In form calling `POST /api/stations/{stationCode}/track-in`.
    4.  Track Out form with one-click queue item selection.
*   **Definition of Done**: Operator can see station queue and move units through steps.
*   **Status**: [x] Done (2025-12-23, queue display added 2025-12-27)

---

# M1.5+ UI Tasks

## Task UI-5: Routing Management Page
*   **Goal**: View and manage routing definitions.
*   **Input**: `domain_docs/mes/spec/routing/01_routing_engine.md`
*   **Actions**:
    1.  Add `/mes/routes` list page with search and source filter.
    2.  Add `/mes/routes/:routingCode` detail page with steps view.
    3.  Add execution config editing in detail page.
    4.  Add compile button in detail page header.
*   **Definition of Done**: Users can view routing details and compile directly from detail page.
*   **Status**: [x] Done (2025-12-26)

## Task UI-6: Route Versions Page
*   **Goal**: View and compile route versions.
*   **Input**: `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
*   **Actions**:
    1.  Add `/mes/route-versions` list page.
    2.  Add compile action with routing code input.
    3.  Display version status (READY/INVALID) with compile errors.
*   **Definition of Done**: Users can compile routes and view version status.
*   **Status**: [x] Done (2025-12-26)

## Task UI-7: Integration Sync Page
*   **Goal**: Trigger and monitor integration syncs.
*   **Input**: `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Add integration sync page at `/system/integrations`.
    2.  Display sync status with last cursor and outcome.
    3.  Add manual sync trigger buttons for each entity type.
*   **Definition of Done**: Users can trigger syncs and see status.
*   **Status**: [x] Done (2025-12-26)

## Task UI-8: Unit Traceability Page
*   **Goal**: Query unit production history.
*   **Input**: `domain_docs/mes/spec/traceability/01_traceability_contract.md`
*   **Actions**:
    1.  Add `/mes/trace` page with SN search input.
    2.  Support run/latest query mode.
    3.  Display unit info, route version, execution records, data values, defects, materials.
*   **Definition of Done**: Users can query any SN and see full production history.
*   **Status**: [x] Done (2025-12-27)

## Task UI-9: Run Detail Page
*   **Goal**: View run progress and units.
*   **Input**: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
*   **Actions**:
    1.  Add `/mes/runs/:runNo` detail page.
    2.  Display unit statistics (total, queued, in-station, done, failed).
    3.  Show recent units with trace links.
    4.  Link from run list to detail page.
*   **Definition of Done**: Users can view run progress and unit breakdown.
*   **Status**: [x] Done (2025-12-27)