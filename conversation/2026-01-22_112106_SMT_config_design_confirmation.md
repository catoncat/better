# SMT config design confirmation

## Context
- User asked for more context, impact analysis, and recommendations to confirm the "config list" design (PrepItemPolicy, TimeRuleConfig, WaivePermissionMatrix) used to turn SMT confirmation decisions into executable configuration.

## Decisions
- User confirmed recommended approach:
  - Config storage: hybrid (repo template + DB override with audit)
  - Time rule scope: route/step by default, optional product override
  - Waiver permissions: reuse existing roles with explicit grants; optional dual-approval for high-risk
- User reconfirmed the above after additional context.

## Plan
- Document the confirmed configuration design in guidance docs and align plan tasks.

## Findings
- PrepItemPolicy should enforce "record must exist" and allow AUTO confirm only when a reliable data source exists; otherwise MANUAL confirmation is required.
- TimeRuleConfig should be scoped by route/step (optional product override), not global, to avoid false alerts; rule default is Alert + Waive (soft gate).
- WaivePermissionMatrix should reuse existing roles with explicit permissions; dual-approval is optional for high-risk rules.
- Config storage options (doc-only vs DB vs hybrid) have trade-offs between governance, auditability, and operational change speed.

## Progress
- Documented the configuration design in `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`.
- Updated `domain_docs/mes/plan/smt_gap_task_breakdown.md` to reflect the confirmed config strategy.
- Added template location and example config templates under `domain_docs/mes/spec/config/`.
- Added SMT-A sample configs and DB override schema doc under `domain_docs/mes/spec/config/`.

## Errors
- None.

## Open Questions
- None (decisions confirmed).

## References
- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
- `domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md`
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
