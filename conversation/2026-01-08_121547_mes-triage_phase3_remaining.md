# mes-triage_phase3_remaining

## Context
- User completed Phase 3 items `3.2.1.3` and `3.2.2.4` and asked: what tasks remain in `domain_docs/mes/plan/phase3_tasks.md`.

## Decisions
- Use `domain_docs/mes/plan/phase3_tasks.md` as the single source of truth for "what remains" and present remaining work as parallel tracks with a short candidate shortlist.
- Do not edit plan/docs/code during triage (only write this conversation note).

## Plan
- Worktree scan:
  - Current: `/Users/envvar/lzb/better` (main)
  - In-flight worktrees: none
- Git status (callout):
  - Branch `main` is ahead of `origin/main` by 3 commits.
  - Untracked file exists: `conversation/2026-01-08_121135_prompt_skills_workflow_and_cc_2_1_0.md`.
- Remaining tracks and candidates:
  - Track A: Docs and Contract Alignment (P0)
    - Candidates:
      - `3.1.2` Fix docs drift: acceptance scenarios match real API/UI; depends on reading current endpoints; touch points `domain_docs/mes/tests/01_acceptance_scenarios.md`, `apps/server/src/modules/mes/trace/*`, `apps/web/src/routes/_authenticated/mes/*`.
      - `3.1.1` Milestone definition sync (M3 vs M4); depends on aligning repo-level docs; touch points `domain_docs/mes/plan/01_milestones.md`, `domain_docs/mes/CONTEXT.md`, `README.md`.
  - Track B: E2E and Seed Hardening (P0)
    - Candidates:
      - `3.2.1.4` Seed repeatability: `db:seed` outputs stable acceptance defaults; depends on seed idempotency rules; touch points `apps/server/scripts/seed.ts`, `apps/server/scripts/seed-mes.ts`.
      - `3.2.3.3` Script repeatable runs: data isolation and clear idempotency strategy; touch points `apps/server/scripts/test-mes-flow.ts`.
      - `3.2.4` Degraded path acceptance: waive/manual paths for readiness gates + trace attribution; touch points `apps/server/src/modules/mes/readiness/*`, `apps/server/src/modules/mes/trace/*`, `apps/server/scripts/test-mes-flow.ts`.
  - Track C: Ops and Deployment Readiness (P0)
    - Candidates:
      - `3.3.1` Single-binary deploy checklist; touch points `agent_docs/05_ops/single_binary_deployment.md`, `README.md`.
      - `3.3.2` SQLite backup/restore/upgrade SOP; touch points `agent_docs/05_ops/single_binary_deployment.md`, `agent_docs/00_onboarding/setup.md`.
  - Track D: UX and Training (P1)
    - Candidates:
      - `3.4.1` Role SOPs; touch points `user_docs/`, `apps/web/src/routes/_authenticated/mes/*`.
      - `3.4.2` Live demo script narrative; touch points `user_docs/`, `domain_docs/mes/tests/01_acceptance_scenarios.md`.
  - Track E: Data Collection Config (P0, high-churn)
    - Candidates:
      - `3.5.1` API CRUD for `DataCollectionSpec`; depends on Prisma schema; touch points `packages/db/prisma/schema/schema.prisma`, `apps/server/src/modules/mes/*`.
      - Follow-ons: `3.5.2` Web management page, `3.5.3` routing bind UI, `3.5.4` execution input, `3.5.5` RBAC defaults.
- Conflicts:
  - Track E blocks or conflicts with Track B/Track D when they touch shared areas (`apps/server/src/modules/mes/routing/service.ts`, `apps/web/src/routes/_authenticated/mes/execution.tsx`).
  - Track A is mostly doc-only and can be parallel with any track.
- Selection prompt:
  - Pick one next implementation target (track or candidate). Recommended next P0s: `3.5.1` or `3.2.4` or `3.2.3.3`.

## Open Questions
- Should we treat `3.2.4` as script-only (waive paths) or also extend trace schema to surface waiver/actor/reason?
- For `3.2.3.3`, should repeatability mean “same DB without resets” or “fresh DB per run” (fast path via seed + unique IDs)?

## References
- `domain_docs/mes/plan/phase3_tasks.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/CONTEXT.md`
- `conversation/2026-01-08_121135_prompt_skills_workflow_and_cc_2_1_0.md`
