# Routing Integration Acceptance Scenarios (ERP + Versions)

This document complements `domain_docs/mes/tests/01_acceptance_scenarios.md` by focusing on ERP routing ingestion, compilation, and version freeze behaviors.

---

## 1. ERP Import Idempotency

### Scenario 1: Re-import same ERP route does not duplicate steps
- Import route R1 twice with identical payload
- Expect:
  - raw tables updated idempotently
  - canonical steps not duplicated
  - no new executable version created when canonical steps are unchanged

---

## 2. Diff → New Version

### Scenario 2: Step list change produces new executable version
- Import route steps: [10,20,30]
- Import updated route steps: [10,20,25,30]
- Expect:
  - new executable version created
  - if step 25 lacks execution semantics, version is INVALID

---

## 3. Compile Validations

### Scenario 3: AUTO step without ingestMapping fails compile
- Configure step as AUTO but omit ingestMapping
- Expect compile INVALID and descriptive errors

### Scenario 4: Operation-level default enables new step compile
- Add operation-level config providing stationType/stationGroup
- Import ERP route with new step using that operation
- Expect compile READY

---

## 4. Run Freeze

### Scenario 5: In-flight run remains on frozen version after ERP update
- Create Run with routeVersion v1
- ERP import produces v2 READY
- Expect:
  - Run continues executing based on v1 snapshot
  - New Run uses v2

### Scenario 6: New version INVALID does not block production if older READY exists
- v2 INVALID
- v1 READY exists
- Expect new Run selects v1 (latest READY)

---

## 5. Non-contiguous stepNo advancement

### Scenario 7: PASS advances to next sorted stepNo (not +1)
- steps: [10,20,30]
- unit currentStepNo = 10
- TrackOut PASS → currentStepNo becomes 20

---

## 6. Trace Consistency

### Scenario 8: Trace returns frozen version, not latest
- Run uses v1, ERP later produces v2
- GET trace for a unit produced by the run
- Expect routeVersion=v1 in output by default
