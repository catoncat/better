# Implementation Plan: Phase 2 (M2 - Execution Control & Quality)

This document outlines the task breakdown for Phase 2 of the MES implementation.
Goal: Add readiness gates, FAI, defect/disposition handling, and OQC sampling.

## Task 2.1: Line Readiness Check & Exception Loop
*   **Goal**: Enforce readiness gates before run authorization.
*   **Design**: `domain_docs/mes/plan/phase2_line_readiness_design.md`
*   **Requirements**: `conversation/line_readiness_check_discussion.md`
*   **Input**: `domain_docs/mes/spec/process/01_end_to_end_flows.md`, `domain_docs/mes/spec/integration/01_system_integrations.md`
*   **Actions**:
    1.  Add `ReadinessCheck` and `ReadinessCheckItem` tables with enums.
    2.  Implement check logic for equipment (TPM), material (BOM), and route (ExecutableRouteVersion).
    3.  Add APIs: precheck, formal check, get result, waive item.
    4.  Gate run authorization on readiness pass or waived.
    5.  Add `mes:readiness:*` permissions.
    6.  Auto-trigger precheck on Run creation and TPM/route changes.
*   **Definition of Done**: Runs cannot authorize when readiness fails; exceptions can be waived with audit trail.
*   **Status**: [ ] Pending

## Task 2.2: FAI Tasks & Authorization Gate
*   **Goal**: Implement first-article inspection before full batch execution.
*   **Input**: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
*   **Actions**:
    1.  Add FAI task entity with status flow (PENDING -> IN_PROGRESS -> PASSED/FAILED).
    2.  Allow limited trial run quantity for FAI.
    3.  Add APIs to create FAI tasks, record inspection results, and finalize.
    4.  Gate batch authorization on FAI pass.
*   **Definition of Done**: Runs cannot authorize without a PASSED FAI task; FAI records are queryable.
*   **Status**: [ ] Pending

## Task 2.3: Defect & Disposition (Rework/Scrap/Hold)
*   **Goal**: Handle NG results and downstream dispositions.
*   **Input**: `domain_docs/mes/spec/traceability/01_traceability_contract.md`
*   **Actions**:
    1.  Create defect records on TrackOut FAIL, linked to step/unit/operation.
    2.  Implement disposition workflow: REWORK -> re-enter step; SCRAP -> finalize; HOLD -> isolate/release.
    3.  Add APIs and UI actions for disposition handling.
*   **Definition of Done**: NG units follow disposition rules with traceability records for each action.
*   **Status**: [ ] Pending

## Task 2.4: OQC Sampling Flow
*   **Goal**: Add outgoing quality control sampling and gating.
*   **Input**: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
*   **Actions**:
    1.  Add OQC sampling rule (fixed rate or fixed quantity).
    2.  Create OQC tasks after unit completion and record results.
    3.  Gate run/WO completion on OQC pass or disposition.
*   **Definition of Done**: OQC tasks are created and results influence run/WO completion.
*   **Status**: [ ] Pending

## Task 2.5: Final Confirmation & Closeout
*   **Goal**: Close runs and work orders after all gates are satisfied.
*   **Input**: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
*   **Actions**:
    1.  Implement final confirmation criteria for run and work order completion.
    2.  Record closeout summary and archive placeholder.
*   **Definition of Done**: Runs/WO close only after readiness, FAI, execution, defect, and OQC gates pass.
*   **Status**: [ ] Pending
