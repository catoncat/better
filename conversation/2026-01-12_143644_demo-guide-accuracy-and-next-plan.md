# Demo Guide Accuracy + Next Plan

## Context

- Goal: validate whether the current demo runbook is accurate and derive the next task plan from:
  - `user_docs/demo/guide.md`
  - `conversation/2026-01-12_123703_smt-flow-e2e-demo.md`

## Findings

- `user_docs/demo/guide.md` is broadly consistent with the intended SMT E2E demo sequence (Readiness → Loading → FAI trial → Authorize → Execute → Closeout → OQC/MRB → Trace).
- The conversation note is accurate for the FAI-trial decision and rationale, but contains a now-stale open question (DIP guide) and stale path naming (`SMP` vs `SMT`).

## Decisions

- Treat `SMP` → `SMT` renaming as canonical and fix remaining references so the demo guide points to real spec files.
- Keep `conversation/2026-01-12_123703_smt-flow-e2e-demo.md` as a decision record; handle “current status” updates via a new note (this file) instead of rewriting history.

## Plan (Next Tasks)

### Track A — Demo Docs & Runbook

1. Run a “follow-the-guide” dry run and patch any step mismatch (missing button name, wrong page, missing prerequisite).
2. Clarify Unit creation expectations in the guide (scan-new-SN auto-creates Unit on first TrackIn vs “生成单件” in Run detail).

### Track B — Demo UX Linearity (Reduce Operator Confusion)

3. Add “开始执行” deep-link from Run detail to `/mes/execution` with Run/WONO prefilled (and optionally recommended first station).
4. Add a lightweight “待执行批次” list on `/mes/execution` (AUTHORIZED + PREP FAI trial eligible) to avoid guessing which station/run to operate next.

### Track C — Ops & Training Readiness

5. Finish deployment + backup SOP docs (phase3: `3.3.1` + `3.3.2`) so the demo can be reproduced outside dev machines.

## Open Questions

- For next iteration, do we want to prioritize (B) demo UX linearity or (C) deployment/ops readiness first?
- Should the execution page explicitly surface “FAI trial mode” (Run=PREP) vs “production mode” (Run=AUTHORIZED/IN_PROGRESS) in UI?

## References

- Demo guide: `user_docs/demo/guide.md`
- Original decision note: `conversation/2026-01-12_123703_smt-flow-e2e-demo.md`
- SMT spec: `domain_docs/mes/spec/process/03_smt_flows.md`
- Run detail page: `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- Execution page: `apps/web/src/routes/_authenticated/mes/execution.tsx`
- Phase 3 plan: `domain_docs/mes/plan/phase3_tasks.md`
