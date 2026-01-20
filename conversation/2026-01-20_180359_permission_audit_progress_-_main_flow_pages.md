# permission audit progress - main flow pages

## Context
- Continuing permission-first audit for MES main flow pages (readiness/loading/execution/quality/trace).
- User selected option 1 (main flow track first).

## Decisions
- Proceed with main flow page audits before config/ops pages or fixes.

## Plan
- Finish any remaining main flow pages (check if `/mes/rework-tasks` is in scope).
- Then choose between config/ops page audit or implementing fixes.

## Findings
- `/mes/readiness-config` and `/mes/readiness-exceptions`: missing readiness:view query gating; line list needs run:read+run:create gating.
- `/mes/loading` and `/mes/loading/slot-config`: missing loading:view/verify gating; unlock slot uses loading:config; route/line selectors can 403 without route:read or run:read+run:create.
- `/mes/execution`: station list/queue require exec:read/track_in/track_out; queries not gated; actions only disabled.
- `/mes/fai`: data-collection-specs list needs data_spec permissions; generate units needs run:authorize; view not gated.
- `/mes/oqc` + `/mes/oqc/rules`: list not gated; "view record" not gated; rules dialog uses lines/routes without gating.
- `/mes/defects`: sensitive quality:disposition view/action not gated; trace lookup gated correctly.
- `/mes/trace`: trace:read not gated; page should show no-access when missing.

## Progress
- Added audit entries for readiness, loading, execution, FAI, OQC, OQC rules, defects, and trace in `user_docs/demo/permission_audit_plan.md`.
- Updated capability map with station view row (exec:read or exec:track_in/out).

## Errors
- None.

## Open Questions
- Should `/mes/rework-tasks` be included in the main flow audit list?

## References
- `user_docs/demo/permission_audit_plan.md`
- `conversation/2026-01-20_142730_permission_audit_plan.md`
