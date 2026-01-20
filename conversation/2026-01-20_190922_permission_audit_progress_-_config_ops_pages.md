# permission audit progress - config ops pages

## Context
- User selected option 1 (config/ops audit).
- Audited route/routing config pages, data-specs, integration, and master data pages.

## Decisions
- Config/ops pages are treated as permission-first modules; missing view should show page-level no-access (not role-based).

## Plan
- Next: decide whether to start fixes or audit auxiliary record pages.

## Findings
- `/mes/routes` list and detail links have no permission gating; queries always fire.
- `/mes/routes/:routingCode` depends on route:read, route:configure, route:compile plus station groups, stations, data-specs; only actions are partially gated.
- `/mes/route-versions` uses route search + version list (route:read) without gating; compile button gated.
- `/mes/data-collection-specs` requires data_spec:read + data_spec:config; operation filter requires operation:read + data_spec:config; actions gated but list/filter not.
- `/mes/integration/status` and `/mes/integration/manual-entry` use system:integration and loading:config; line list is ungated.
- `/mes/materials`, `/mes/boms`, `/mes/work-centers` require route:read; list pages have no gating.

## Progress
- Added config/ops audit entries to `user_docs/demo/permission_audit_plan.md`.

## Errors
- None.

## Open Questions
- Should we proceed to implement gating fixes or audit auxiliary record pages next?

## References
- `user_docs/demo/permission_audit_plan.md`
