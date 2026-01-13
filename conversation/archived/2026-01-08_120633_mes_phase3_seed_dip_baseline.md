# mes_phase3_seed_dip_baseline

## Context
- Implement Phase 3 task `3.2.1.3`: seed DIP minimal master data and ensure executable route version is READY after `bun run db:seed`.

## Decisions
- DIP seed uses distinct codes to avoid clashing with SMT demo data:
  - Line: `LINE-DIP-A`
  - Station group: `DIP-LINE-A`
  - Stations: `ST-DIP-INS-01`, `ST-DIP-WAVE-01`, `ST-DIP-POST-01`, `ST-DIP-TEST-01`
  - Routing: `PCBA-DIP-V1` with 4 steps; first step `requiresFAI=true` to keep the default FAI gate demonstrable.
- Readiness for DIP line defaults to `["ROUTE"]` to avoid external integration dependencies during M3 acceptance.

## Plan
- Seed: add DIP line/stations/operations/routing in `apps/server/scripts/seed-mes.ts`.
- Seed: compile default executable route versions for both SMT and DIP in `apps/server/scripts/seed.ts`.
- Verify:
  - `bun run db:push`
  - `bun run db:seed`
  - `bun -e` query (from `apps/server/`) to confirm `ExecutableRouteVersion.status=READY` for `PCBA-DIP-V1`.
- Update plan checkboxes in `domain_docs/mes/plan/phase3_tasks.md`.

## Open Questions
- Should we add a DIP scenario mode to `apps/server/scripts/test-mes-flow.ts` (route/line/stations override) to validate execution end-to-end on DIP, not only compile readiness?
- DIP material readiness: decide whether DIP should use LOADING, MATERIAL, or a separate “插件物料准备” readiness subtype later.

## References
- `domain_docs/mes/plan/phase3_tasks.md`
- `domain_docs/mes/spec/process/04_dip_flows.md`
- `apps/server/scripts/seed-mes.ts`
- `apps/server/scripts/seed.ts`
