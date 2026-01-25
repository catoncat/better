# MES Demo Acceptance Issues

> Created: 2026-01-25
> Scope: MES demo acceptance (DIP/SMT)

## Fixed

- `bun run mes:acceptance --track dip` failed to seed due to relative `DATABASE_URL` resolving under `apps/server/` (blocked by seed safety check); fixed by resolving `file:` URLs to absolute paths in `scripts/mes-acceptance.ts`.
- `/integration/work-orders` returned `403 Forbidden` when called as admin in `apps/server/scripts/test-mes-flow.ts`; updated flow to use `planner` actor (permission `wo:receive`).
- `POST /work-orders/:woNo/runs` returned `422` because `planQty` is now required; updated `apps/server/scripts/test-mes-flow.ts` to include `planQty`.
- FAI start/trial sequence required units to exist; updated `apps/server/scripts/test-mes-flow.ts` to call `POST /runs/:runNo/generate-units` and use the generated SN.

## Open

- (none)
