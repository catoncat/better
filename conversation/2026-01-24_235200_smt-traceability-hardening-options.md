# smt-traceability-hardening-options

## Context
- Track A implementation (T4.6.1/T4.6.2/T4.6.6) for SMT traceability hardening.

## Decisions
- Option 1: implement static pre-run checklist template view using existing readiness items (no DB changes).
- Option A: WASH_4H time rule starts at REFLOW or AOI track-out, ends at WASH track-in.

## Plan
- Update time rule event handling to accept AOI as start for WASH_4H.
- Add static checklist template UI on run detail page.
- Update plan/align/docs to reflect completed tasks and behavior.

## Findings
- None.

## Progress
- None.

## Errors
- None.

## Open Questions
- None.

## References
- domain_docs/mes/plan/phase4_tasks.md
- domain_docs/mes/spec/impl_align/03_smt_align.md
