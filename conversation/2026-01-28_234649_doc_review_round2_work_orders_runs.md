# doc review round2 work orders runs

## Context
- Round2 doc review for Work Orders / Runs (follow-up to Round1 Loading).

## Decisions
- Keep Round2 status in_progress while documenting deviations and awaiting doc fixes.

## Plan
- Review Work Orders / Runs docs vs API/UI and record deviations in round2 matrix.
- Propose doc fixes for user docs and playbook error codes/closeout notes.

## Findings
- user_docs/02_planner.md: receive flow described as list-based; UI uses manual “接收外部工单”. Filters (product/date) and create-run fields over-specified.
- API/UI support routing update, pick-status update, work order closeout; user docs missing.
- Authorization error codes in exception doc mismatch implementation (READINESS_CHECK_FAILED / FAI_NOT_PASSED / RUN_NOT_READY).
- Run closeout requires manual trigger and can return OQC_REQUIRED; doc leans “auto close”.

## Progress
- Created `domain_docs/mes/doc_review/round2_work_orders_runs.md` and populated alignment matrix + deviations.
- Updated `domain_docs/mes/doc_review/00_status.md` to Round1 completed, Round2 in_progress.

## Errors
- None.

## Open Questions
- Whether to proceed with doc fixes now (planner guide + exception doc + closeout doc).

## References
- domain_docs/mes/doc_review/round2_work_orders_runs.md
- domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md
- domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md
- domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md
- domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md
- user_docs/02_planner.md
