# Context
User requested a detailed gap report comparing the confirmed SMT form collection table to current system implementation.

# Decisions
- Create a standalone report in compair docs to avoid mixing with existing specs.

# Plan
- Review confirmed form table and identify requirements.
- Compare against current MES modules and readiness/gating logic.
- Write a detailed gap matrix report and commit only the new file.

# Findings
- Bake and solder paste usage/temperature APIs exist but are not linked to readiness gating or time-rule enforcement.
- Loading/FAI/OQC/Track cover the main production chain but do not satisfy several form-specific fields or signature rules.
- No Factory Manager role or time-rule alert/waiver implementation exists.

# Progress
- Added `domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md` with global-rule gaps and per-form gaps.

# Errors
- None.

# Open Questions
- Should we map the “Factory Manager” waiver role to an existing role or create a new role/permission set?
- Do you want the gap report extended with a phased implementation plan and estimates?

# References
- domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md
- apps/server/src/modules/mes/readiness/service.ts
- apps/server/src/modules/mes/loading/service.ts
- apps/server/src/modules/mes/bake/routes.ts
- apps/server/src/modules/mes/solder-paste/routes.ts
- apps/server/src/modules/mes/fai/routes.ts
- apps/server/src/modules/mes/defect/routes.ts
