# MES UI acceptance (agent-browser)

## Context
- Goal: Run the UI acceptance flow in `user_docs/demo/acceptance_plan.md` / `user_docs/demo/guide.md` using `agent-browser`, and record issues in `user_docs/demo/acceptance_issues.md`.
- Local env already has services responding:
  - Frontend: `http://localhost:3001/` (HTTP 200)
  - Backend: `http://localhost:3000/api/health` (HTTP 200)

## Decisions
- Start from current running environment; only run `bun run db:seed` / `bun apps/server/scripts/seed-demo.ts` + restart if required data (e.g. `WO-MGMT-SMT-QUEUE`) is missing or state is inconsistent.
- Use a dedicated `agent-browser` session name to avoid ref collisions.

## Plan
- Use `agent-browser` to login and complete Phase 1 → 8 of the acceptance plan (SMT mainline).
- Capture: runNo + unit SN used for trace validation.
- Update `user_docs/demo/acceptance_plan.md` checkboxes as steps complete; record any blockers in `user_docs/demo/acceptance_issues.md`.

## Findings
- None yet.

## Progress
- Environment check: services reachable on `localhost:3000` / `localhost:3001`.

## Errors
- None yet.

## Open Questions
- None.

## References
- `user_docs/demo/acceptance_plan.md`
- `user_docs/demo/acceptance_issues.md`
- `user_docs/demo/guide.md`
