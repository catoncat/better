# Development Plan & Milestones

## 1. Milestone Overview

This document outlines the development milestones for the MES system, focusing on key features such as production execution, data collection, and traceability. The goal is to deliver a functional system in phases, ensuring each critical feature is tested and implemented sequentially.

## 2. Milestones

### M1: Production Execution Closed Loop
* **Goal**: Complete the basic production loop, from work order reception to unit completion.
* **Features**: Work order reception, production run creation, manual and automatic track-in/out, minimal MES UI (work orders, runs, station execution).
* **Acceptance Criteria**: System can create a production run and track units through different steps via API and UI.

### M1.5: ERP Routing Integration & Versioning
* **Goal**: Use ERP routing as the source of truth for step sequence, with MES-owned execution semantics and version freeze.
* **Features**: Pull-based ERP route sync (ENG_Route), mapping tables, execution config management, executable route versioning, run freeze, trace includes route and routeVersion, integration mock module for contract testing.
* **Acceptance Criteria**: ERP import yields canonical route + READY executable version; new runs freeze a version; trace returns route + routeVersion + step list; step advance uses sorted stepNo.

### M1.6: Integration Foundation (ERP/TPM Inbound)
* **Goal**: Build reliable inbound data sync for ERP/TPM beyond routing.
* **Features**: IntegrationMessage + sync cursor state, idempotent pull pipeline, ERP master data (work orders/materials/BOM/work centers), TPM equipment/status/maintenance, manual + cron triggers, normalization into canonical tables.
* **Acceptance Criteria**: Syncs produce canonical entities without duplicates; cursors advance deterministically; TPM status gates can block execution.

### M1.7: Experience & Demo Readiness
* **Goal**: Make the current system easy to experience end-to-end.
* **Features**: One-command demo flow, default MES seed data, routing management + execution config editing UI, UI entry points for route compile and integration sync.
* **Acceptance Criteria**: Fresh setup can run the full flow without manual API steps.

### M2: Quality Control and Authorization
* **Goal**: Implement quality control checks, including FAI and batch authorization.
* **Features**: Line readiness checks + exception loop, FAI tasks (trial run + inspection), defect/NG registration, disposition (rework/scrap/hold/release), OQC sampling tasks, batch authorization, final confirmation/closeout.
* **Acceptance Criteria**: Runs cannot authorize without readiness + FAI pass; defects/disposition and OQC gates are enforced; runs/WO close only after final confirmation.

### M3: Data Collection and Traceability
* **Goal**: Implement data collection and traceability features.
* **Features**: Data collection for key metrics, traceability for each unit and material used.
* **Acceptance Criteria**: Traceability queries must return full production history, including defects and data values.

### M4: Ingest and Batch Processing
* **Goal**: Extend the system to handle automated and batch processing scenarios.
* **Features**: Automatic/BATCH/TEST event ingest, equipment integration for auto track-in/out, batch data collection.
* **Acceptance Criteria**: System handles auto/batch/test events with consistent routing and data validation.

## Future (Out of Current Scope)

### Integration Outbound (ERP/TPM Feedback)
* **Goal**: Push MES execution results back to ERP/TPM.
* **Features**: Production completion, material consumption, quality outcomes, traceability summaries, retry with idempotency.
* **Acceptance Criteria**: Outbound payloads are delivered reliably with replay support and auditability.
