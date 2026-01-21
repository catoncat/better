# Context
Continuing SMT playbook docs. Focus on FAI flow with data generation and management details.

# Decisions
- Document FAI flow as a separate run-flow chapter aligned to SMT flow diagram (post-loading, pre-authorization).

# Plan
- Next: execution/trace flow doc, then OQC/closeout, then demo data + validation checklists.

# Findings
- FAI creation requires Run PREP and a PASSED formal readiness check; sampleQty must be satisfied by existing units.
- FAI completion enforces count rules and blocks PASS if SPI/AOI failures exist for the run.

# Progress
- Added `domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md`.

# Errors
- None.

# Open Questions
- None.

# References
- apps/server/src/modules/mes/fai/service.ts
- apps/server/src/modules/mes/fai/schema.ts
- domain_docs/mes/spec/process/03_smt_flows.md
