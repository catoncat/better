# Context
User requested the next steps in order: (1) generate concrete SMT demo dataset via script, (2) add detailed API payload examples to validation docs, (3) add appendix mapping validation steps to DB fields.

# Decisions
- Implement a new SMT demo dataset script (API-driven where possible) and update docs to reference it.
- Then expand validation docs with request payload examples, and add a DB field mapping appendix.

# Plan
1) Add a demo dataset script under `apps/server/scripts` (SMT playbook) and document how to run it.
2) Update `05_validation/*` with API request payload examples per step.
3) Create a new appendix doc mapping validation steps to DB tables/fields.

# Findings
- Existing scripts: `test-mes-flow.ts` and `mes-flow-test/index.ts` already implement API-driven flow with work-order integration, loading, FAI, OQC, and trace checks.
- Readiness checks require stencil + solder paste bindings and status records if those checks are enabled.

# Progress
- Plan created; work to start on demo dataset script.

# Errors
- None.

# Open Questions
- None.

# References
- apps/server/scripts/test-mes-flow.ts
- apps/server/scripts/mes-flow-test/index.ts
- apps/server/src/modules/mes/readiness/service.ts
- domain_docs/mes/smt_playbook/04_demo_data/*
- domain_docs/mes/smt_playbook/05_validation/*
