# SMT gap docs decision alignment + config design

## Context
- User requested to directly implement doc updates for the 3 clarified decisions, and to provide a design for turning decisions into executable permission/rule configuration lists before implementation.

## Decisions
- Doc updates should align with: non-gating items still require records; auto-confirm only when reliable data source exists, otherwise manual confirm; wash-time rule applies only for routes/products with wash step; waiver permissions should reuse existing roles with explicit grants, optional dual approval if needed.

## Plan
- Update confirmed table + gap report to reflect clarified decisions.
- Provide a proposed configuration design for permissions/rules, pending user confirmation.

## Findings
- `SMT 表单采集确认表.md` still referenced Factory Manager and global wash rule; updated to align with clarified decisions.
- `smt_form_confirmation_gap_report.md` global rule rows updated to align with clarified decisions and mapping gaps.
- Task plan alignment needed to keep SMT gap follow-up work consistent with confirmed decisions.

## Progress
- Implemented doc updates in `domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md` and `domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md`.
- Aligned plan docs with confirmed decisions: `domain_docs/mes/plan/smt_gap_task_breakdown.md` and `domain_docs/mes/plan/phase4_tasks.md`.
- Drafted design outline for executable permission/rule configuration (not implemented yet).

## Errors
- None.

## Open Questions
- Confirm the proposed configuration structure and naming for permission/rule lists before implementation.

## References
- `domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md`
- `domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md`
- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
