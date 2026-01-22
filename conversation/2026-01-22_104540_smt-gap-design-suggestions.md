# Context
User asked for a detailed design suggestions report file at domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md.

# Decisions
- Treat prep items as checklist-style entries rather than standalone forms.
- Prep completion requires all items PASS or WAIVED; soft-gate items allow proceed with alert + waiver + record.
- Prefer extending Readiness with prep items to reuse waiver/audit flow.

# Plan
- Summarize confirmed prep rules and mapping from forms to prep items.
- Propose data model, soft-gate/waiver mechanism, time-rule alerting, and phased rollout.

# Findings
- Confirmation table explicitly requires records for prep items and allows non-blocking alert/waiver.
- Gap report indicates missing time-rule alerting, waiver role, and several data capture records.

# Progress
- Added design suggestions doc with prep model, gating logic, mapping table, and phased rollout.

# Errors
- None.

# Open Questions
- None (requirements confirmed in current thread).

# References
- domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md
- domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md
- domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md
