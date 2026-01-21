# Context
User requested step-by-step SMT documentation with a new folder, focusing on data generation context and data management per step. Continuing with configuration slice.

# Decisions
- Add a dedicated routes/products configuration doc explaining route selection, route version freeze, and impact on slot mapping selection.

# Plan
- Next slice: start run-flow docs (`03_run_flow/01_work_order_to_run.md`, then readiness and loading flow) with per-step data generation + management notes.

# Findings
- Routing Engine: Run binds a frozen ExecutableRouteVersion snapshot; productCode + route selection govern execution and slot mapping selection.

# Progress
- Added `domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md`.

# Errors
- None.

# Open Questions
- None.

# References
- domain_docs/mes/spec/routing/01_routing_engine.md
- apps/server/src/modules/mes/loading/service.ts
