## Context
- Feedback: execution config scope UI is too complex (ROUTE/OPERATION/STEP/SOURCE_STEP), and STEP + SOURCE_STEP are effectively merged during compile.
- Goal (P2): reduce user confusion while keeping backend behavior compatible.

## Decisions
- Keep the data model + compile precedence unchanged.
- Simplify the create UI to expose only two scopes by default: Route-level default + Step-level override.
- Keep OPERATION + SOURCE_STEP available behind an “advanced scope” toggle for rare cases and backward compatibility (editing existing configs still renders correctly).

## Changes
- Route detail → ExecutionConfig dialog: default scope options reduced to `ROUTE` + `STEP`; advanced toggle reveals `OPERATION` + `SOURCE_STEP` with explanatory descriptions.
- Docs updated to reflect the UI behavior while keeping the model description accurate.

## Open Questions
- Should we eventually remove OPERATION precedence from the compile engine if it proves unused in production data?
- Should advanced scopes be permission-gated (e.g. admin-only) instead of a UI toggle?

## References
- `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
- `domain_docs/mes/spec/routing/03_route_execution_config.md`
