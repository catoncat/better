# SMT gap design suggestions review

## Context
- User requested a quality review of `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`, focusing on conflicts with prior discussion, errors, and over-design.
- Prior clarification: "准备完成" requires all items pass; non-gating items still require records; soft gate allows continue with alert + waiver + record.

## Decisions
- None yet; this is a review-only assessment.

## Plan
- None.

## Findings
- Potential conflict: "仅记录(RECORD)" notes "提示(可选)" which may imply optional confirmation; user clarified non-gating still must be recorded (and should not be optional). (`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:15`)
- Potential overreach: time rule assumes "回流焊/AOI → 水洗 < 4h" universally; likely needs route/product configuration or optional wash step. (`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:65-67`)
- Role design risk: suggests new "Factory Manager" role without mapping to existing RBAC; may conflict with current role model. (`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:75-77`)
- Duplication risk: new PrepCheck/PrepItemRecord could overlap with existing Readiness/waive/audit; clarify single source of truth. (`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:19-39`)

## Progress
- Review completed; findings recorded in worktree notes.

## Errors
- None.

## Open Questions
- Should non-gating items be "record-only" but still mandatory confirmation? (adjust wording in doc)
- Which existing role should own waiver permissions if a new role is not desired?
- Is the wash-time rule applicable only for specific routes/products?

## References
- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
- `domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md`
