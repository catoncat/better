# MES frontend UX review verification (2026-01-02)

Source: `conversation/mes_frontend_ux_review_prompt.md` report summary.

## Verification results

P0 (blocking)
- Missing work order cancel UI/API: confirmed. No cancel action in `apps/web/src/routes/_authenticated/mes/-components/work-order-columns.tsx` or `apps/web/src/routes/_authenticated/mes/work-orders.tsx`, and no cancel API hook found in `apps/web/src/hooks`.
- Missing navigation entry for readiness exceptions: confirmed. Route exists at `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx` but no item in `apps/web/src/config/navigation.ts`.

P1 (efficiency)
- Release work order cannot select target line: confirmed. `apps/web/src/routes/_authenticated/mes/work-orders.tsx` calls `useReleaseWorkOrder` directly without any line selector UI.
- Runs list lacks batch authorize: confirmed. `apps/web/src/routes/_authenticated/mes/-components/run-columns.tsx` only defines per-row actions, and `apps/web/src/routes/_authenticated/mes/runs/index.tsx` has no selection/bulk controls.
- Runs list lacks line filter: confirmed. `apps/web/src/routes/_authenticated/mes/runs/index.tsx` filter toolbar only includes search and status.
- Track-in scan auto-fill missing: confirmed. `apps/web/src/routes/_authenticated/mes/execution.tsx` uses manual fields for `sn`, `woNo`, `runNo` with no scan parsing logic.

P2 (experience)
- Station selection not remembered: confirmed. `apps/web/src/routes/_authenticated/mes/execution.tsx` uses local state only.
- Queue "one-click track-out" still requires confirm: confirmed. Queue button only fills form via `handleQueueItemClick`; user must submit.
- Trace page ignores `sn` URL param: confirmed. `apps/web/src/routes/_authenticated/mes/trace.tsx` has no `useSearch` or URL parsing, though other pages link with `search={{ sn }}`.
