# Context
User asked whether "门禁=No" means no system entry or just confirmation, and clarified their expectation for preparation items.

# Decisions
- Treat "门禁=No" as non-blocking but still recorded; preparation items still need pass/meet criteria to be marked complete.
- All preparation items should have a pass/meet rule (even if not hard-blocking).

# Plan
- Clarify hard vs soft gate per item (alert + waiver vs block).
- Update confirmation table and gap report once gate policy is confirmed.

# Findings
- Confirmation table includes phrasing like "达标后标记完成" and "程式不一致无法通过", implying criteria exist even when门禁=No.
- User confirmed records should be kept for non-gating items.

# Progress
- Updated confirmation table with prep gating policy.
- Updated gap report to include prep completion rule and soft-gate requirement.

# Errors
- None.

# Open Questions
- None.

# References
- domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md
- domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md
