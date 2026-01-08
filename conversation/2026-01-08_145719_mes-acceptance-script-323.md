## Context
- `domain_docs/mes/plan/phase3_tasks.md` 3.2.3 required upgrading `apps/server/scripts/test-mes-flow.ts` into an acceptance script with SMT/DIP selection and explicit repeatability behavior.
- Issues found: line/route were hardcoded to SMT defaults; repeatability was only implicit via `Date.now()` IDs and not described or controllable.

## Decisions
- Add `--track smt|dip` plus `--line-code` / `--route-code` overrides; DIP defaults to `LINE-DIP-A` + `PCBA-DIP-V1`.
- Make Loading steps optional via `--with-loading` / `--skip-loading` (default: SMT on, DIP off) to support DIP runs without feeder-slot master data.
- Implement explicit repeatability via `--id-strategy unique|reuse-wo` and `--dataset`:
  - `unique`: new WO/SN per run (isolated, DB grows).
  - `reuse-wo`: stable WO per (dataset,track,scenario); reruns create new Run+SN; WO release becomes best-effort if already released/in progress.
- Make station list + Trace expectations depend on track (SMT=5, DIP=4).

## Plan
1) Update CLI to support SMT/DIP selection
2) Add repeatability/idempotency strategy flags
3) Mark 3.2.3.3 as done in phase plan
4) Verify via `bun run lint` and `bun run check-types`

## Open Questions
- None.

## References
- `apps/server/scripts/test-mes-flow.ts`
- `domain_docs/mes/plan/phase3_tasks.md`
