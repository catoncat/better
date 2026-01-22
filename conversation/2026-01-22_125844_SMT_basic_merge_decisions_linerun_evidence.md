# SMT basic merge decisions (line/run evidence)

## Context
- User responded to three open questions from smt-basic vs SMT gap review.
- Decisions should be reflected in SMT gap plan/design guidance.

## Decisions
- Prep record line binding: must require line association (lineCode/lineId) for readiness evidence.
- Readiness evidence should be run-level (runId/runNo/routeStepId) rather than line-level.
- Exception record creator role: pending; user indicated no "leader" role in their org.

## Plan
- Update SMT gap plan constraints + prep policy guidance to require line binding and run-level evidence.
- Ask for confirmation on exception record creator role mapping.

## Findings
- smt-basic record tables currently allow null lineId; run-level linkage absent.

## Progress
- Updated `domain_docs/mes/plan/smt_gap_task_breakdown.md` and `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`.

## Errors
- None.

## Open Questions
- If no leader role is used, which role should create production exception records (quality/admin/operator)?

## References
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
