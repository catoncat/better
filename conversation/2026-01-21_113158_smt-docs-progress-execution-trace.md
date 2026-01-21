# Context
Continuing SMT playbook docs. Focus on execution + trace flow, including unit generation and trace output.

# Decisions
- Document execution + trace as a single chapter to keep data generation and trace output connected.

# Plan
- Next: add OQC/closeout flow doc, then demo data blueprint and validation checklists.

# Findings
- Units are generated via `POST /api/runs/:runNo/generate-units` and start in QUEUED state with SN prefix `SN-${runNo}-`.
- Trace API output includes route + frozen routeVersion, tracks, dataValues, inspections, loadingRecords.

# Progress
- Added `domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md`.

# Errors
- None.

# Open Questions
- None.

# References
- apps/server/src/modules/mes/run/service.ts
- apps/server/src/modules/mes/run/routes.ts
- domain_docs/mes/tech/api/04_api_contracts_trace.md
- domain_docs/mes/spec/traceability/01_traceability_contract.md
