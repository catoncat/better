# MES Triage: M3 Next Work Selection

> Date: 2026-01-12
> Phase: M3 (Go-Live Readiness)

---

## Context

Main worktree is **NOT clean** - uncommitted changes in:
- `apps/server/src/modules/mes/execution/service.ts`
- `apps/server/src/modules/mes/readiness/service.ts`
- `apps/server/src/modules/mes/work-order/schema.ts`
- `apps/server/src/modules/mes/work-order/service.ts`
- `apps/web/src/hooks/use-work-orders.ts`
- `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx`
- `apps/web/src/routes/_authenticated/mes/work-orders.tsx`
- `domain_docs/mes/plan/phase3_tasks.md`
- `domain_docs/mes/tech/api/01_api_overview.md`
- `domain_docs/mes/tech/api/02_api_contracts_execution.md`

Branch is **2 commits ahead** of origin/main (unpushed).

---

## Worktree Scan

- **Current**: `/Users/envvar/lzb/better` (main)
- **In-flight**: `/Users/envvar/lzb/better-wt-m3-e2e-seed-hardening` (m3-e2e-seed-hardening)
  - Status: dirty, behind 41
  - Touch: server (seed scripts)
  - Last commit: docs(mes): update CONTEXT.md to reflect M3 as current phase
  - Files: `apps/server/scripts/seed-mes.ts`, `apps/server/scripts/seed.ts`

---

## M3 Progress Summary

### Done (Track A + B mostly complete)
- [x] 3.1.1 Milestone redefinition
- [x] 3.1.2 Docs drift fix (acceptance scenarios)
- [x] 3.2.1 Seed coverage (SMT + DIP)
- [x] 3.2.2 E2E demo script (gates + quality + closeout + trace)
- [x] 3.2.3 Acceptance script upgrade (CLI + structured output)
- [x] 3.2.4 Degraded path in acceptance
- [x] 3.2.5 Run-line route compatibility guards
- [x] 3.5.1 DataCollectionSpec CRUD API

### Pending (shortlist candidates)
- [ ] 3.1.3 Clean up outdated gap reports
- [ ] 3.3.1 Single-binary deployment docs
- [ ] 3.3.2 SQLite backup/restore/upgrade SOP
- [ ] 3.3.3 Observability & audit baseline
- [ ] 3.4.1 Role-based operation manuals
- [ ] 3.4.2 Go-live demo script
- [ ] 3.4.3 UX optimization backlog
- [ ] 3.4.4 External integration degradation SOP
- [ ] 3.5.2 Web: Data collection spec management page
- [ ] 3.5.3 Web: Route binding UX upgrade (replace dataSpecIdsText)
- [ ] 3.5.4 Execution: Manual data collection entry (TrackOut)
- [ ] 3.5.5 RBAC: Default role permissions alignment

---

## Parallelizable Tracks

### Track A: Docs & Cleanup (low conflict)
- Candidates:
  - **3.1.3 Clean up outdated gap reports**: why now - reduce team confusion about progress; depends on - none; touch points - `issues/`, `domain_docs/mes/plan/*` (docs only, no code)

### Track B: Ops & Deployment (low conflict)
- Candidates:
  - **3.3.1 Single-binary deployment docs**: why now - P0 for go-live; depends on - none; touch points - `agent_docs/05_ops/`, `README.md` (docs only)
  - **3.3.2 SQLite backup/restore/upgrade SOP**: why now - P0 for go-live ops; depends on - 3.3.1 for context; touch points - `agent_docs/05_ops/`, `agent_docs/00_onboarding/setup.md`

### Track C: UX & Training (low conflict)
- Candidates:
  - **3.4.1 Role-based operation manuals**: why now - deliverable for go-live; depends on - none; touch points - `user_docs/`, references web pages (read-only)
  - **3.4.2 Go-live demo script**: why now - stakeholder presentation; depends on - none; touch points - `user_docs/`, references acceptance scenarios (read-only)

### Track D: Data Collection UI (medium conflict)
- Candidates:
  - **3.5.2 Web: DataCollectionSpec management page**: why now - P0, engineers need self-service config; depends on - 3.5.1 API (done); touch points - `apps/web/src/routes/_authenticated/mes/*` (new route), Eden types
  - **3.5.3 Web: Route binding UX upgrade**: why now - remove manual ID entry; depends on - 3.5.2 for picker component; touch points - `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`, `apps/server/src/modules/mes/routing/service.ts`
  - **3.5.4 Execution: Manual data collection entry**: why now - TrackOut needs dynamic inputs; depends on - 3.5.2/3.5.3 for bound specs; touch points - `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/server/src/modules/mes/execution/schema.ts`
  - **3.5.5 RBAC: Default role permissions alignment**: why now - ensure UI/API permission consistency; depends on - 3.5.2 for page entry points; touch points - `packages/db/src/permissions/*`, web pages

---

## Conflicts

- **Track D (3.5.2-3.5.5)** is sequential internally: 3.5.2 must be done before 3.5.3/3.5.4/3.5.5 can proceed meaningfully.
- **Track D** vs **in-flight worktree (m3-e2e-seed-hardening)**: low conflict - seed scripts vs web UI are different areas.
- **Track A/B/C** are mostly docs-only and can run in parallel with Track D.
- **Main worktree uncommitted changes** touch execution/readiness/work-order services - if Track D touches these areas, recommend a dedicated worktree.

---

## Recommended Picks

Given the P0 priority and the fact that the API is already done, the most impactful next step is:

1. **3.5.2 Web: DataCollectionSpec management page** - unblocks the rest of Track D (P0)
2. **3.3.1 Single-binary deployment docs** - parallel track, P0, docs-only

---

## Selection Prompt

Pick one track or one candidate. I will confirm scope and start plan-first implementation.

Also: would you like a dedicated worktree for the chosen item? (Recommended if running another track in parallel or running full lint/typecheck.) If yes, I can use `bun scripts/worktree-new.ts <branch> <path>`.

---

## Selected

(To be filled after user picks)
