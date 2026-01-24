# acceptance-plan_coverage_review

## Context
- User asked to review whether `user_docs/demo/acceptance_plan.md` covers:
  - End-to-end flow
  - SMT flow
  - DIP flow

## Decisions
- Created a dedicated DIP acceptance plan (`user_docs/demo/acceptance_plan_dip.md`) based on the DIP walkthrough in `user_docs/demo/guide.md`.
- Kept a shared issues tracker (`user_docs/demo/acceptance_issues.md`) and updated its header to reference both SMT + DIP plans.

## Plan
- Compare acceptance plan stages against process specs:
  - `domain_docs/mes/spec/process/01_end_to_end_flows.md`
  - `domain_docs/mes/spec/process/03_smt_flows.md`
  - `domain_docs/mes/spec/process/04_dip_flows.md`
- Cross-check alignment with `user_docs/demo/guide.md` (SMT + optional DIP sections).

## Findings
- `user_docs/demo/acceptance_plan.md` primarily covers the SMT happy-path UI loop:
  - WO release → Run create → readiness → loading → FAI (trial) → authorize → manual TrackIn/Out through SMT stations → closeout + OQC (PASS) → trace.
- Gaps vs full end-to-end spec:
  - Does not cover ERP sync/route compile steps (seeded data assumed).
  - Does not include WO closeout (E2E includes WO closeout after Run terminal state).
  - Does not cover negative branches (FAIL/defect/disposition, OQC FAIL→MRB, rework run).
- DIP flow is not covered: the plan references DIP data in “数据策略” but has no DIP-specific stages/steps.
- `user_docs/demo/guide.md` contains a dedicated DIP walkthrough section (`## 四、DIP 流程演示（可选）`) that could be incorporated.

## Progress
- Coverage review completed.
- DIP acceptance plan drafted: `user_docs/demo/acceptance_plan_dip.md`.

## Errors
- None

## Open Questions
- Should acceptance be:
  - “Happy path only” (fast smoke), or
  - Include 1-2 failure branches (MRB/defect) as required regression?

## References
- `user_docs/demo/acceptance_plan.md`
- `user_docs/demo/guide.md`
- `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- `domain_docs/mes/spec/process/03_smt_flows.md`
- `domain_docs/mes/spec/process/04_dip_flows.md`
