# mes-next_smt-gap_phase1_time-rule_m4

## Context
- User asked `mes-next` to pick the next MES work item from plans.

## Decisions
- Selected sequence: **A → commit → B**
  - A: 对齐 `domain_docs/mes/plan/smt_gap_task_breakdown.md` 的 Phase 1 勾选与 As-built 引用
  - B: 实现 `1.1.8`（准备项记录 runId/runNo/routeStepId 关联与写入规则）

## Plan
- Track A: SMT Gap Phase 1 hardening
  - Candidates:
    - `T1.1` remaining (`1.1.4/1.1.6/1.1.8`): close PrepItemPolicy/override/audit + run-level evidence linking; depends on none; touch points `domain_docs/mes/plan/smt_gap_task_breakdown.md`, `packages/db/prisma/schema/schema.prisma`, `apps/server/src/modules/mes/readiness/service.ts`, `apps/server/src/modules/mes/run/service.ts`

- Track B: SMT Gap Phase 2 TimeRule engine
  - Candidates:
    - `T2.1` TimeRuleDefinition/Instance + CRUD: unblock time-based compliance (paste 24h, wash 4h); depends on Track A / Phase 1 completion; touch points `domain_docs/mes/plan/smt_gap_task_breakdown.md`, `packages/db/prisma/schema/schema.prisma`
    - `T2.2` Cron monitor + alert + override: make rules executable (scan, expire, waive); depends on `T2.1`; touch points `domain_docs/mes/plan/smt_gap_task_breakdown.md`, `agent_docs/05_ops/cron_jobs.md`

- Track C: M4 doc-first contract (no code)
  - Candidates:
    - `4.1.1-4.1.3` IngestEvent contract + ingestMapping + acceptance scenarios: prepares M4 without touching core execution yet; depends on whether “acceptance first” is still a gate; touch points `domain_docs/mes/plan/phase4_tasks.md`, `domain_docs/mes/spec/traceability/01_traceability_contract.md`

- Conflicts:
  - Track A blocks Track B: Phase 2 depends on Phase 1; both likely touch `schema.prisma` and readiness evaluation.
  - Track B conflicts with later M4 implementation (Track B/C in `phase4_tasks.md`): shared touch points execution/trace.

- Selection prompt: pick one track/candidate; I will confirm scope and start plan-first implementation.

## Findings
- Git status: clean, except untracked `conversation/2026-01-23_121017_mes-next_smt-gap-p2-timerule.md`.
- Worktree scan:
  - Current: `/Users/envvar/lzb/better` (main)
  - In-flight worktrees: none
- `domain_docs/mes/CONTEXT.md` (2026-01-20): acceptance plans are currently shelved; next focus is `plan/smt_gap_task_breakdown.md` (SMT Gap).
- `domain_docs/mes/plan/smt_gap_task_breakdown.md` (2026-01-22): Phase 1 `T1.2/T1.3/T1.4/T1.5` done; `T1.1` still has `[ ]` subtasks `1.1.4/1.1.6/1.1.8`; Phase 2 TimeRule (`T2.1/T2.2/T2.3/T2.4`) are pending.
- `domain_docs/mes/plan/phase4_tasks.md` (2026-01-14): M4 draft is pending; doc says “acceptance first” before implementing M4 tracks, which may conflict with the newer `CONTEXT.md`.

## Progress
- Drafted next-work tracks/candidates and recorded conflicts.
- User selected: A → commit → B

## Errors
- None.

## Open Questions
- Should we treat “acceptance first” as still blocking (per `domain_docs/mes/plan/01_milestones.md` / `domain_docs/mes/plan/phase4_tasks.md`) or keep it shelved (per newer `domain_docs/mes/CONTEXT.md`)?
- Which track/candidate should we start next?
- Do you want a dedicated worktree for the chosen item?

## References
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- `domain_docs/mes/plan/phase4_tasks.md`
