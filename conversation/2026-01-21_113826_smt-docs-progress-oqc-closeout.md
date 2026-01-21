# Context
Continuing SMT playbook docs. Focus on OQC trigger, sampling rules, and closeout flow with MRB.

# Decisions
- Document OQC/closeout as its own run-flow chapter with sampling rules and MRB outcomes.

# Plan
- Next: start demo data blueprint and detailed validation checklists.

# Findings
- OQC triggers when run is IN_PROGRESS and all units terminal; no rule or sampleSize=0 completes run directly.
- OQC items are recorded per unit SN with PASS/FAIL/NA; sampling rules support PERCENTAGE/FIXED and priorities.

# Progress
- Added `domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md`.

# Errors
- None.

# Open Questions
- None.

# References
- apps/server/src/modules/mes/oqc/service.ts
- apps/server/src/modules/mes/oqc/trigger-service.ts
- apps/server/src/modules/mes/oqc/schema.ts
- domain_docs/mes/spec/process/03_smt_flows.md
