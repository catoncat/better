# Implementation Plan: Phase 1 UI (M1 - Production Execution Closed Loop)

This document outlines the UI task breakdown for Phase 1 of the MES implementation.
Goal: Provide a minimal operator UI for the basic production loop.

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
    2.  Add "Receive Work Order" dialog calling `POST /api/integration/work-orders`.
    3.  Add "Release Work Order" action calling `POST /api/work-orders/{woNo}/release`.
*   **Definition of Done**: Users can create and release work orders via UI; list updates.
*   **Status**: [x] Done (2025-12-23)

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
*   **Goal**: Support manual Track In/Out from the UI.
*   **Input**: `agent_docs/02_frontend/ui_system.md`
*   **Actions**:
    1.  Provide station selector or input for `stationCode`.
    2.  Track In form calling `POST /api/stations/{stationCode}/track-in` (requires `sn`, `woNo`, `runNo`).
    3.  Track Out form calling `POST /api/stations/{stationCode}/track-out` (requires `sn`, `runNo`, `result`).
*   **Definition of Done**: Operator can move a unit through steps and see status changes.
*   **Status**: [x] Done (2025-12-23)