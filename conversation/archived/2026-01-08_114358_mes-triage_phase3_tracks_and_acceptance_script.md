# mes-triage_phase3_tracks_and_acceptance_script

## Context
- User asked to decompose `domain_docs/mes/plan/phase3_tasks.md` into parallelizable work, then pick one item and start implementing.
- Target milestone: M3 Go-Live Readiness (acceptance repeatability, deployability, and operator-ready workflows).

## Decisions
- Use phase3 "Tracks" as the parallelization unit and add finer-grained subtask checklists where needed (especially Track B and Track E).
- Start with Track B (E2E Demo and Seed Hardening): make the acceptance script executable and aligned with current gates.
- Acceptance script uses role-based seeded users instead of admin-only:
  - Admin lacks `route:compile` (and other execution permissions) by design; permissions are split across engineer/planner/leader/quality.
- Seed minimal Readiness and Loading config for the demo line in `seed-mes.ts` so `bun run db:seed` produces a runnable acceptance baseline.

## Plan
- Worktree scan:
  - Current: `/Users/envvar/lzb/better` (main)
  - In-flight worktrees: none
- Tracks and candidates (phase3):
  - Track A: Docs and Contract Alignment
    - Candidates: 3.1.1 milestone definition sync; 3.1.2 acceptance scenario drift; 3.1.3 stale reports cleanup
    - Conflicts: touches `README.md` and shared docs with Track C/D
  - Track B: E2E Demo and Seed Hardening (selected)
    - Candidates: 3.2.1 seed completeness; 3.2.2 script covers gates; 3.2.3 acceptance script CLI and summary; 3.2.4 degrade path
    - Conflicts: overlaps with Track E on execution/data-collection touch points
  - Track C: Ops and Deployment Readiness
    - Candidates: 3.3.1 single-binary deploy doc; 3.3.2 backup/restore SOP; 3.3.3 observability minimums
  - Track D: UX and Training
    - Candidates: 3.4.1 role SOP; 3.4.2 demo script; 3.4.3 UX blocker list; 3.4.4 integration degrade SOP
  - Track E: Data Collection Config (high-churn)
    - Candidates: 3.5.1 API CRUD; 3.5.2 web list/dialog; 3.5.3 routing binding UI; 3.5.4 execution data input; 3.5.5 RBAC defaults
- Implemented slice (Track B):
  - Update `domain_docs/mes/plan/phase3_tasks.md` to add subtasks and mark progress.
  - Update `apps/server/scripts/seed-mes.ts`:
    - Seed `Line.meta.readinessChecks.enabled` defaults (ROUTE + LOADING) for the demo line.
    - Seed `FeederSlot` + `SlotMaterialMapping` so loading expectations can be created.
  - Update `apps/server/scripts/test-mes-flow.ts`:
    - Role-based logins (admin/engineer/planner/leader/quality) matching preset RBAC.
    - Flow covers: routing compile, WO receive/release, run create, loading, readiness, FAI gate, authorize, execution, closeout, trace.
    - Forces OQC branch via temporary sampling rule creation and cleans it up after.
    - Emits a step-level summary and optional JSON output.
  - Verification:
    - `bun run db:push`
    - `bun run db:seed`
    - `bun run dev:server`
    - `bun apps/server/scripts/test-mes-flow.ts`
    - `bun run lint`
    - `bun run check-types`
    - `rg -nP "\\p{Extended_Pictographic}" domain_docs/mes`

## Open Questions
- DIP baseline: confirm the canonical DIP demo codes (line/stations/routing) before implementing 3.2.1.3.
- Should `apps/server/scripts/test-mes-flow.ts` assume `db:seed` is already done, or should it optionally run setup (push/seed) as a mode?
- Should the forced OQC sampling rule be default behavior or behind a CLI flag (to keep the environment closer to production defaults)?
- Trace materials currently come from `materialUse` only; loading verification does not write `materialUse` yet. Decide whether to extend trace/material plumbing in M3.

## References
- `domain_docs/mes/plan/phase3_tasks.md`
- `apps/server/scripts/seed-mes.ts`
- `apps/server/scripts/test-mes-flow.ts`
- `packages/db/src/permissions/preset-roles.ts`
- Commands: `bun run db:push`, `bun run db:seed`, `bun run dev:server`, `bun apps/server/scripts/test-mes-flow.ts`, `bun run lint`, `bun run check-types`
