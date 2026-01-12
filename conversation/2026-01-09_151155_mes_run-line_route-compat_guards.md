# mes_run-line_route-compat_guards

## Context
- Demo issue: a Run could be created on an incompatible line (e.g. Run on `LINE-DIP-A` while route snapshot requires station group `SMT-LINE-A`), and readiness PRECHECK could still pass (only checked routeVersion READY).
- Goal: prevent misleading “it works” states by adding earlier guards (release/run-create/readiness/execution) and clear UX.
- Concrete example: `RUN-WO-TEST-SMT-1767938484985` bound to `LINE-DIP-A` with route snapshot stationGroup `SMT-LINE-A` (incompatible).

## Decisions
- Keep “Release/派工 chooses line” UX; make it real by persisting dispatch info on `WorkOrder.meta.dispatch.*` (no schema migration).
- Add server-side guardrails:
  - `createRun` rejects line mismatch vs dispatch, and rejects line incompatible with route snapshot constraints.
  - readiness `ROUTE` check also validates line compatibility (so precheck/formal catches early).
  - execution TrackIn/Out rejects stations not belonging to `run.line`.
- Add minimal web UX:
  - Run create dialog pre-fills/locks line if work order has dispatch line.
  - Use `unwrap()` + mutation `onError` to show readable errors and avoid unhandled rejections.

## Plan
- Update `domain_docs/mes/plan/phase3_tasks.md` with a new guard task under Track B.
- Implement server changes (work-order release/createRun, readiness checkRoute, execution TrackIn/Out).
- Implement web dialog + mutation error handling.
- Update API docs and error code overview.
- Verify with `bun run check-types` and `bun run lint`/`bun run format`.

## Open Questions
- PickStatus rule: should manual `pickStatus` be editable after `WO=RELEASED` / after any Run exists, or should it be locked/monotonic to avoid confusing state changes during demo?

## References
- `user_docs/demo/演示问题记录.md`
- `domain_docs/mes/plan/phase3_tasks.md`
- `apps/server/src/modules/mes/work-order/service.ts`
- `apps/server/src/modules/mes/readiness/service.ts`
- `apps/server/src/modules/mes/execution/service.ts`
- `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx`
- `apps/web/src/hooks/use-runs.ts`
- `apps/web/src/hooks/use-work-orders.ts`
- `domain_docs/mes/tech/api/02_api_contracts_execution.md`
