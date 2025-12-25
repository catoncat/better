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

### M2: Quality Control and Authorization
* **Goal**: Implement quality control checks, including FAI and batch authorization.
* **Features**: Quality checks, defect registration, rework handling, batch authorization.
* **Acceptance Criteria**: Units must pass quality checks before batch production can proceed.

### M3: Data Collection and Traceability
* **Goal**: Implement data collection and traceability features.
* **Features**: Data collection for key metrics, traceability for each unit and material used.
* **Acceptance Criteria**: Traceability queries must return full production history, including defects and data values.

### M4: Ingest and Batch Processing
* **Goal**: Extend the system to handle automated and batch processing scenarios.
* **Features**: Integration with equipment for automatic event tracking, batch data collection.
* **Acceptance Criteria**: System must handle batch events and integrate automatically with equipment.
